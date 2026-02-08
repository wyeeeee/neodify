import { z } from 'zod';

export const createAgentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  model: z.string().min(1),
  systemPromptMd: z.string().default(''),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().positive().default(4000),
  skillIds: z.array(z.string()).default([]),
  mcpIds: z.array(z.string()).default([])
});

export const createSkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  skillMdContent: z.string().min(1)
});

export const updateSkillContentSchema = z.object({
  skillMdContent: z.string().min(1)
});

export const createMcpSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mode: z.enum(['http', 'sse', 'uvx', 'npx']),
  enabled: z.boolean().default(true),
  endpoint: z.string().nullable().default(null),
  command: z.string().nullable().default(null),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
  headers: z.record(z.string(), z.string()).default({}),
  authConfig: z.record(z.string(), z.unknown()).default({}),
  timeoutMs: z.number().int().positive().default(30_000)
});

export const createScheduleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cronExpr: z.string().min(1),
  agentId: z.string().min(1),
  inputTemplate: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true)
});

export const runWebSchema = z.object({
  agentId: z.string().min(1),
  prompt: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type CreateSkillDto = z.infer<typeof createSkillSchema>;
export type UpdateSkillContentDto = z.infer<typeof updateSkillContentSchema>;
export type CreateMcpDto = z.infer<typeof createMcpSchema>;
export type CreateScheduleDto = z.infer<typeof createScheduleSchema>;
export type RunWebDto = z.infer<typeof runWebSchema>;

