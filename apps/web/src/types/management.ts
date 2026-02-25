export interface AgentConfig {
  id: string
  name: string
  enabled: boolean
  model: string
  systemPromptMd: string
  temperature: number
  maxTokens: number
}

export interface AgentDetail extends AgentConfig {
  skillIds: string[]
  mcpIds: string[]
}

export interface SkillConfig {
  id: string
  name: string
  rootPath: string
  skillMdPath: string
  enabled: boolean
  skillMdContent: string
}

export type McpMode = 'http' | 'sse' | 'uvx' | 'npx'

export interface McpConfig {
  id: string
  name: string
  mode: McpMode
  enabled: boolean
  endpoint: string | null
  command: string | null
  args: string[]
  env: Record<string, string>
  headers: Record<string, string>
  authConfig: Record<string, unknown>
  timeoutMs: number
}

export interface CreateAgentPayload {
  id: string
  name: string
  enabled: boolean
  model: string
  systemPromptMd: string
  temperature: number
  maxTokens: number
  skillIds: string[]
  mcpIds: string[]
}
