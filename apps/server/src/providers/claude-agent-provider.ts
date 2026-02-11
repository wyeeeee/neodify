import {
  query,
  type McpServerConfig,
  type SDKAssistantMessage,
  type SDKMessage,
  type SettingSource
} from '@anthropic-ai/claude-agent-sdk';
import type { AgentProvider, AgentProviderEvent, AgentProviderInput } from './agent-provider.js';
import type { RunResult } from '../types/domain.js';

type EventPayload = Record<string, unknown>;

interface ParsedAssistantContent {
  text: string;
  toolCalls: Array<{
    toolUseId: string | null;
    toolName: string;
    input: unknown;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAssistantContent(message: SDKAssistantMessage['message']): ParsedAssistantContent {
  const textParts: string[] = [];
  const toolCalls: ParsedAssistantContent['toolCalls'] = [];

  const rawContent = isRecord(message) ? message.content : undefined;
  if (!Array.isArray(rawContent)) {
    return { text: '', toolCalls };
  }

  for (const block of rawContent) {
    if (!isRecord(block)) {
      continue;
    }

    const blockType = typeof block.type === 'string' ? block.type : '';
    if (blockType === 'text' && typeof block.text === 'string') {
      textParts.push(block.text);
      continue;
    }

    if (blockType === 'tool_use') {
      const toolUseId = typeof block.id === 'string' ? block.id : null;
      const toolName = typeof block.name === 'string' ? block.name : 'unknown_tool';
      toolCalls.push({
        toolUseId,
        toolName,
        input: block.input
      });
    }
  }

  return {
    text: textParts.join(''),
    toolCalls
  };
}

function parseStreamEventType(event: unknown): string | null {
  if (!isRecord(event)) {
    return null;
  }
  return typeof event.type === 'string' ? event.type : null;
}

function createSystemEvent(message: Extract<SDKMessage, { type: 'system' }>): {
  eventType: string;
  payload: EventPayload;
} | null {
  switch (message.subtype) {
    case 'init':
      return {
        eventType: 'agent.system.init',
        payload: {
          cwd: message.cwd,
          model: message.model,
          tools: message.tools,
          mcpServers: message.mcp_servers,
          permissionMode: message.permissionMode
        }
      };
    case 'status':
      return {
        eventType: 'agent.system.status',
        payload: {
          status: message.status,
          permissionMode: message.permissionMode
        }
      };
    case 'hook_started':
      return {
        eventType: 'agent.hook.started',
        payload: {
          hookId: message.hook_id,
          hookName: message.hook_name,
          hookEvent: message.hook_event
        }
      };
    case 'hook_progress':
      return {
        eventType: 'agent.hook.progress',
        payload: {
          hookId: message.hook_id,
          hookName: message.hook_name,
          hookEvent: message.hook_event,
          stdout: message.stdout,
          stderr: message.stderr,
          output: message.output
        }
      };
    case 'hook_response':
      return {
        eventType: 'agent.hook.response',
        payload: {
          hookId: message.hook_id,
          hookName: message.hook_name,
          hookEvent: message.hook_event,
          outcome: message.outcome,
          exitCode: message.exit_code ?? null,
          stdout: message.stdout,
          stderr: message.stderr,
          output: message.output
        }
      };
    case 'task_notification':
      return {
        eventType: 'agent.task.notification',
        payload: {
          taskId: message.task_id,
          status: message.status,
          outputFile: message.output_file,
          summary: message.summary
        }
      };
    case 'files_persisted':
      return {
        eventType: 'agent.files.persisted',
        payload: {
          files: message.files,
          failed: message.failed,
          processedAt: message.processed_at
        }
      };
    case 'compact_boundary':
      return {
        eventType: 'agent.system.compact_boundary',
        payload: {
          compactMetadata: message.compact_metadata
        }
      };
  }

  return null;
}

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
    const emitEvent = (event: AgentProviderEvent) => {
      events.push(event);
      if (input.onEvent) {
        input.onEvent(event);
      }
    };

    let finalText = '';
    let structuredOutput: unknown | null = null;
    let totalCostUsd = 0;
    let sessionId: string | null = null;
    const startedAt = Date.now();

    const options = {
      cwd: input.cwd,
      settingSources: ['project'] as SettingSource[],
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
      resume: input.resumeSessionId
    };

    const runtimeQuery = query({
      prompt: input.prompt,
      options
    });

    try {
      for await (const message of runtimeQuery) {
        sessionId = message.session_id;

        if (message.type === 'system') {
          const systemEvent = createSystemEvent(message);
          if (systemEvent) {
            emitEvent(systemEvent);
          }
          continue;
        }

        if (message.type === 'assistant') {
          const parsed = parseAssistantContent(message.message);
          const text = parsed.text;

          if (text) {
            emitEvent({
              eventType: 'agent.assistant',
              payload: {
                text,
                parentToolUseId: message.parent_tool_use_id,
                error: message.error ?? null
              }
            });
            finalText = text;
          }

          for (const toolCall of parsed.toolCalls) {
            emitEvent({
              eventType: 'agent.tool.call',
              payload: {
                toolUseId: toolCall.toolUseId,
                toolName: toolCall.toolName,
                input: toolCall.input,
                parentToolUseId: message.parent_tool_use_id
              }
            });
          }
          continue;
        }

        if (message.type === 'user') {
          if (message.tool_use_result !== undefined) {
            emitEvent({
              eventType: 'agent.tool.result',
              payload: {
                parentToolUseId: message.parent_tool_use_id,
                toolUseResult: message.tool_use_result,
                isSynthetic: message.isSynthetic ?? false,
                isReplay: 'isReplay' in message ? message.isReplay : false
              }
            });
          }
          continue;
        }

        if (message.type === 'tool_progress') {
          emitEvent({
            eventType: 'agent.tool.progress',
            payload: {
              toolUseId: message.tool_use_id,
              toolName: message.tool_name,
              parentToolUseId: message.parent_tool_use_id,
              elapsedTimeSeconds: message.elapsed_time_seconds
            }
          });
          continue;
        }

        if (message.type === 'tool_use_summary') {
          emitEvent({
            eventType: 'agent.tool.summary',
            payload: {
              summary: message.summary,
              precedingToolUseIds: message.preceding_tool_use_ids
            }
          });
          continue;
        }

        if (message.type === 'auth_status') {
          emitEvent({
            eventType: 'agent.auth.status',
            payload: {
              isAuthenticating: message.isAuthenticating,
              output: message.output,
              error: message.error ?? null
            }
          });
          continue;
        }

        if (message.type === 'result') {
          totalCostUsd = message.total_cost_usd;
          if ('structured_output' in message && message.structured_output !== undefined) {
            structuredOutput = message.structured_output;
          }

          if (message.subtype === 'success' && !finalText && typeof message.result === 'string') {
            finalText = message.result;
          }

          emitEvent({
            eventType: 'agent.result',
            payload: {
              subtype: message.subtype,
              isError: message.is_error,
              totalCostUsd: message.total_cost_usd,
              durationMs: message.duration_ms,
              durationApiMs: message.duration_api_ms,
              numTurns: message.num_turns,
              stopReason: message.stop_reason,
              permissionDenials: message.permission_denials,
              errors: 'errors' in message ? message.errors : []
            }
          });
          continue;
        }

        if (message.type === 'stream_event') {
          const streamEventType = parseStreamEventType(message.event);
          emitEvent({
            eventType: 'agent.stream_event',
            payload: {
              type: streamEventType,
              parentToolUseId: message.parent_tool_use_id,
              event: message.event
            }
          });
          continue;
        }
      }
    } finally {
      runtimeQuery.close();
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
