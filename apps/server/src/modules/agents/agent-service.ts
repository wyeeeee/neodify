import type { DbContext } from '../../db/index.js';
import type { AgentConfig, McpConfig, SkillConfig } from '../../types/domain.js';
import type { CreateAgentDto } from '../../types/api.js';

export class AgentService {
  constructor(private readonly db: DbContext) {}

  saveAgent(input: CreateAgentDto): void {
    const now = Date.now();
    this.db.agentRepository.upsert({
      id: input.id,
      name: input.name,
      enabled: input.enabled,
      model: input.model,
      systemPromptMd: input.systemPromptMd,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      createdAt: now,
      updatedAt: now
    });

    this.db.agentSkillBindingRepository.replaceByAgent(
      input.id,
      input.skillIds.map((skillId, index) => ({
        agentId: input.id,
        skillId,
        enabled: true,
        priority: index
      }))
    );

    this.db.agentMcpBindingRepository.replaceByAgent(
      input.id,
      input.mcpIds.map((mcpId, index) => ({
        agentId: input.id,
        mcpId,
        enabled: true,
        priority: index
      }))
    );
  }

  listEnabledAgents(): AgentConfig[] {
    return this.db.agentRepository.listEnabled().map((item) => ({
      id: item.id,
      name: item.name,
      enabled: item.enabled,
      model: item.model,
      systemPromptMd: item.systemPromptMd,
      temperature: item.temperature,
      maxTokens: item.maxTokens
    }));
  }

  resolveAgent(agentId: string): {
    agent: AgentConfig;
    skills: SkillConfig[];
    mcps: McpConfig[];
  } {
    const agent = this.db.agentRepository.getById(agentId);
    if (!agent || !agent.enabled) {
      throw new Error('Agent 不存在或未启用');
    }

    const skillIds = this.db.agentSkillBindingRepository.listEnabledSkillIdsByAgent(agentId);
    const skills = skillIds
      .map((skillId) => this.db.skillRepository.getById(skillId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.enabled))
      .map((item) => ({
        id: item.id,
        name: item.name,
        rootPath: item.rootPath,
        skillMdPath: item.skillMdPath,
        enabled: item.enabled
      }));

    const mcpIds = this.db.agentMcpBindingRepository.listEnabledMcpIdsByAgent(agentId);
    const mcps = mcpIds
      .map((mcpId) => this.db.mcpRepository.getById(mcpId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.enabled))
      .map((item) => ({
        id: item.id,
        name: item.name,
        mode: item.mode,
        enabled: item.enabled,
        endpoint: item.endpoint,
        command: item.command,
        args: JSON.parse(item.argsJson) as string[],
        env: JSON.parse(item.envJson) as Record<string, string>,
        headers: JSON.parse(item.headersJson) as Record<string, string>,
        authConfig: JSON.parse(item.authConfigJson) as Record<string, unknown>,
        timeoutMs: item.timeoutMs
      }));

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        enabled: agent.enabled,
        model: agent.model,
        systemPromptMd: agent.systemPromptMd,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens
      },
      skills,
      mcps
    };
  }
}
