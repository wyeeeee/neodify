export type McpMode = 'http' | 'sse' | 'uvx' | 'npx';

export type RunSource = 'web';

export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentRecord {
  id: string;
  name: string;
  enabled: boolean;
  model: string;
  systemPromptMd: string;
  temperature: number;
  maxTokens: number;
  createdAt: number;
  updatedAt: number;
}

export interface SkillRecord {
  id: string;
  name: string;
  rootPath: string;
  skillMdPath: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface McpRecord {
  id: string;
  name: string;
  mode: McpMode;
  enabled: boolean;
  endpoint: string | null;
  command: string | null;
  argsJson: string;
  envJson: string;
  headersJson: string;
  authConfigJson: string;
  timeoutMs: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationRecord {
  id: string;
  agentId: string;
  title: string;
  cwd: string;
  sdkSessionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AgentSkillBindingRecord {
  agentId: string;
  skillId: string;
  enabled: boolean;
  priority: number;
}

export interface AgentMcpBindingRecord {
  agentId: string;
  mcpId: string;
  enabled: boolean;
  priority: number;
}

export interface RunRecord {
  id: string;
  source: RunSource;
  agentId: string;
  conversationId: string | null;
  turnIndex: number;
  sdkSessionId: string | null;
  status: RunStatus;
  inputJson: string;
  outputJson: string | null;
  errorMsg: string | null;
  startedAt: number;
  endedAt: number | null;
  latencyMs: number | null;
  costJson: string;
}

export interface RunEventRecord {
  id: number;
  runId: string;
  seq: number;
  eventType: string;
  payloadJson: string;
  createdAt: number;
}
