export type McpMode = 'http' | 'sse' | 'uvx' | 'npx';

export interface AgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  model: string;
  systemPromptMd: string;
  temperature: number;
  maxTokens: number;
}

export interface SkillConfig {
  id: string;
  name: string;
  rootPath: string;
  skillMdPath: string;
  enabled: boolean;
}

export interface McpConfig {
  id: string;
  name: string;
  mode: McpMode;
  enabled: boolean;
  endpoint: string | null;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  headers: Record<string, string>;
  authConfig: Record<string, unknown>;
  timeoutMs: number;
}

export interface RunInput {
  source: 'web' | 'cron';
  agentId: string;
  conversationId?: string;
  prompt: string;
  metadata: Record<string, unknown>;
}

export interface RunResult {
  text: string;
  structuredOutput: unknown | null;
  totalCostUsd: number;
  durationMs: number;
  sessionId: string | null;
  events: Array<{
    eventType: string;
    payload: Record<string, unknown>;
  }>;
}
