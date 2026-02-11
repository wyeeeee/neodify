import type { McpConfig, RunResult } from '../types/domain.js';

export interface AgentProviderEvent {
  eventType: string;
  payload: Record<string, unknown>;
}

export interface AgentProviderInput {
  prompt: string;
  systemPrompt: string;
  model: string;
  maxTokens: number;
  mcpList: McpConfig[];
  cwd: string;
  resumeSessionId?: string;
  onEvent?: (event: AgentProviderEvent) => void;
}

export interface AgentProvider {
  run(input: AgentProviderInput): Promise<RunResult>;
}
