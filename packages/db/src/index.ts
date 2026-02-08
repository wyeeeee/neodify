import { createSqlite } from './client.js';
import {
  AgentRepository,
  AgentMcpBindingRepository,
  AgentSkillBindingRepository,
  McpRepository,
  RunEventRepository,
  RunRepository,
  ScheduleRepository,
  SkillRepository
} from './repositories.js';
import { initializeSchema } from './schema.js';

export * from './types.js';

export interface DbContext {
  agentRepository: AgentRepository;
  agentSkillBindingRepository: AgentSkillBindingRepository;
  agentMcpBindingRepository: AgentMcpBindingRepository;
  skillRepository: SkillRepository;
  mcpRepository: McpRepository;
  scheduleRepository: ScheduleRepository;
  runRepository: RunRepository;
  runEventRepository: RunEventRepository;
}

export function createDbContext(dbPath?: string): DbContext {
  const db = createSqlite(dbPath);
  initializeSchema(db);
  return {
    agentRepository: new AgentRepository(db),
    agentSkillBindingRepository: new AgentSkillBindingRepository(db),
    agentMcpBindingRepository: new AgentMcpBindingRepository(db),
    skillRepository: new SkillRepository(db),
    mcpRepository: new McpRepository(db),
    scheduleRepository: new ScheduleRepository(db),
    runRepository: new RunRepository(db),
    runEventRepository: new RunEventRepository(db)
  };
}
