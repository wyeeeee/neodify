import { beforeEach, describe, expect, test, vi } from 'vitest';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeAgentProvider } from '../src/providers/claude-agent-provider.js';

vi.mock('@anthropic-ai/claude-agent-sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/claude-agent-sdk')>(
    '@anthropic-ai/claude-agent-sdk'
  );
  return {
    ...actual,
    query: vi.fn()
  };
});

function createMockQuery(messages: unknown[]) {
  async function* createIterator() {
    for (const message of messages) {
      yield message;
    }
  }

  const iterator = createIterator();
  const close = vi.fn();
  return Object.assign(iterator, { close });
}

describe('ClaudeAgentProvider event mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should persist tool call and tool result events', async () => {
    const mockedQuery = vi.mocked(query);
    const mockQuery = createMockQuery([
      {
        type: 'system',
        subtype: 'init',
        cwd: 'C:/workspace/runtime/conv_a',
        model: 'claude-sonnet-4-5',
        tools: ['Read', 'Bash'],
        mcp_servers: [],
        permissionMode: 'default',
        session_id: 'sess_1',
        uuid: 'u1'
      },
      {
        type: 'assistant',
        parent_tool_use_id: null,
        error: undefined,
        session_id: 'sess_1',
        uuid: 'u2',
        message: {
          content: [
            { type: 'text', text: '先调用工具。' },
            { type: 'tool_use', id: 'tool_001', name: 'Bash', input: { command: 'pwd' } }
          ]
        }
      },
      {
        type: 'tool_progress',
        tool_use_id: 'tool_001',
        tool_name: 'Bash',
        parent_tool_use_id: null,
        elapsed_time_seconds: 0.4,
        session_id: 'sess_1',
        uuid: 'u3'
      },
      {
        type: 'user',
        parent_tool_use_id: 'tool_001',
        isSynthetic: true,
        tool_use_result: { stdout: 'C:/workspace/runtime/conv_a' },
        session_id: 'sess_1',
        message: {
          role: 'user',
          content: []
        }
      },
      {
        type: 'tool_use_summary',
        summary: '已通过 Bash 获取工作目录。',
        preceding_tool_use_ids: ['tool_001'],
        session_id: 'sess_1',
        uuid: 'u4'
      },
      {
        type: 'stream_event',
        parent_tool_use_id: 'tool_001',
        session_id: 'sess_1',
        uuid: 'u5',
        event: {
          type: 'content_block_delta'
        }
      },
      {
        type: 'result',
        subtype: 'success',
        is_error: false,
        total_cost_usd: 0.012,
        duration_ms: 1000,
        duration_api_ms: 700,
        num_turns: 1,
        stop_reason: 'end_turn',
        permission_denials: [],
        result: '最终回答',
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          service_tier: 'standard'
        },
        modelUsage: {},
        session_id: 'sess_1',
        uuid: 'u6'
      }
    ]);

    mockedQuery.mockReturnValue(mockQuery as never);

    const provider = new ClaudeAgentProvider();
    const streamedEvents: Array<{ eventType: string }> = [];
    const result = await provider.run({
      prompt: '测试工具事件',
      systemPrompt: '你是测试助手',
      model: 'claude-sonnet-4-5',
      maxTokens: 1024,
      mcpList: [
        {
          id: 'mysql-db',
          name: 'mysql-db',
          mode: 'npx',
          enabled: true,
          endpoint: null,
          command: 'npx',
          args: ['universal-db-mcp'],
          env: {},
          headers: {},
          authConfig: {},
          timeoutMs: 30000
        }
      ],
      cwd: 'C:/workspace/runtime/conv_a',
      onEvent: (event) => {
        streamedEvents.push({ eventType: event.eventType });
      }
    });

    const queryCall = mockedQuery.mock.calls[0]?.[0];
    const allowedTools = queryCall?.options?.allowedTools as string[];
    expect(allowedTools).toContain('mcp__mysql-db__*');

    expect(result.sessionId).toBe('sess_1');
    expect(result.text).toBe('先调用工具。');

    const eventTypes = result.events.map((item) => item.eventType);
    expect(eventTypes).toContain('agent.system.init');
    expect(eventTypes).toContain('agent.assistant');
    expect(eventTypes).toContain('agent.tool.call');
    expect(eventTypes).toContain('agent.tool.progress');
    expect(eventTypes).toContain('agent.tool.result');
    expect(eventTypes).toContain('agent.tool.summary');
    expect(eventTypes).toContain('agent.stream_event');
    expect(eventTypes).toContain('agent.result');

    const toolCallEvent = result.events.find((item) => item.eventType === 'agent.tool.call');
    expect(toolCallEvent?.payload.toolName).toBe('Bash');
    expect(toolCallEvent?.payload.toolUseId).toBe('tool_001');

    const toolResultEvent = result.events.find((item) => item.eventType === 'agent.tool.result');
    expect(toolResultEvent?.payload.parentToolUseId).toBe('tool_001');

    const streamedTypes = streamedEvents.map((item) => item.eventType);
    expect(streamedTypes).toEqual(eventTypes);
  });
});
