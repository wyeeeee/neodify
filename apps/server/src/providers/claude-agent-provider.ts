import { query } from '@anthropic-ai/claude-agent-sdk';
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
import type { AgentProvider, AgentProviderInput } from './agent-provider.js';
import type { RunResult } from '../types/domain.js';

type UnknownContentBlock = { type: string; text?: string };

function toMcpConfig(mcpList: AgentProviderInput['mcpList']): Record<string, McpServerConfig> {
  const result: Record<string, McpServerConfig> = {};
  for (const item of mcpList) {
    if (!item.enabled) {
      continue;
    }
    if (item.mode === 'http' && item.endpoint) {
      result[item.id] = {
        type: 'http',
        url: item.endpoint,
        headers: item.headers
      };
      continue;
    }
    if (item.mode === 'sse' && item.endpoint) {
      result[item.id] = {
        type: 'sse',
        url: item.endpoint,
        headers: item.headers
      };
      continue;
    }
    if ((item.mode === 'uvx' || item.mode === 'npx') && item.command) {
      result[item.id] = {
        type: 'stdio',
        command: item.command,
        args: item.args,
        env: item.env
      };
    }
  }
  return result;
}

export class ClaudeAgentProvider implements AgentProvider {
  async run(input: AgentProviderInput): Promise<RunResult> {
    const events: RunResult['events'] = [];
    let finalText = '';
    let structuredOutput: unknown | null = null;
    let totalCostUsd = 0;
    let sessionId: string | null = null;
    const startedAt = Date.now();

    for await (const message of query({
      prompt: input.prompt,
      options: {
        cwd: input.cwd,
        settingSources: ['project'],
        allowedTools: ['Skill', 'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        sandbox: {
          enabled: true,
          autoAllowBashIfSandboxed: true,
          allowUnsandboxedCommands: false
        },
        systemPrompt: input.systemPrompt,
        model: input.model,
        maxTurns: 12,
        mcpServers: toMcpConfig(input.mcpList),
        extraArgs: {
          'max-output-tokens': String(input.maxTokens)
        },
        resume: input.resumeSessionId
      }
    })) {
      if ('session_id' in message && typeof message.session_id === 'string') {
        sessionId = message.session_id;
      }
      if (message.type === 'assistant') {
        const blocks = message.message.content as UnknownContentBlock[];
        const text = blocks
          .filter((block): block is UnknownContentBlock => block.type === 'text' && typeof block.text === 'string')
          .map((block) => block.text)
          .join('');
        if (text) {
          events.push({
            eventType: 'agent.assistant',
            payload: { text }
          });
          finalText = text;
        }
      }

      if (message.type === 'result') {
        totalCostUsd = message.total_cost_usd;
        if ('structured_output' in message && message.structured_output !== undefined) {
          structuredOutput = message.structured_output;
        }
        events.push({
          eventType: 'agent.result',
          payload: {
            subtype: message.subtype,
            isError: message.is_error,
            totalCostUsd: message.total_cost_usd
          }
        });
      }

      if (message.type === 'stream_event') {
        events.push({
          eventType: 'agent.stream_event',
          payload: {
            type: message.event.type
          }
        });
      }
    }

    return {
      text: finalText,
      structuredOutput,
      totalCostUsd,
      durationMs: Date.now() - startedAt,
      sessionId,
      events
    };
  }
}
