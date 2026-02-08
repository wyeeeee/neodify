import type { McpConfig, RunResult } from '../types/domain.js';

export interface AgentProviderInput {
  prompt: string;
  systemPrompt: string;
  model: string;
  maxTokens: number;
  mcpList: McpConfig[];
  cwd: string;
}

export interface AgentProvider {
  run(input: AgentProviderInput): Promise<RunResult>;
}
