import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createDbContext } from '@neodify/db';
import {
  createAgentSchema,
  createMcpSchema,
  createScheduleSchema,
  createSkillSchema,
  runWebSchema,
  updateSkillContentSchema
} from './types/api.js';
import { AgentService } from './modules/agents/agent-service.js';
import { McpService } from './modules/mcp/mcp-service.js';
import { RunEventBus } from './modules/runs/run-event-bus.js';
import { RunService } from './modules/runs/run-service.js';
import { ScheduleService } from './modules/schedules/schedule-service.js';
import { SchedulerRunner } from './modules/schedules/scheduler-runner.js';
import { SkillFileService } from './modules/skills/skill-file.service.js';
import { SkillRuntimeService } from './modules/skills/skill-runtime.service.js';
import { SkillService } from './modules/skills/skill-service.js';
import { ClaudeAgentProvider } from './providers/claude-agent-provider.js';

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.cwd(), process.env.DATABASE_URL)
    : undefined;
  const db = createDbContext(dbPath);

  const skillFileService = new SkillFileService();
  const skillRuntimeService = new SkillRuntimeService(skillFileService.getRepoRoot());
  const skillService = new SkillService(db, skillFileService);
  const mcpService = new McpService(db);
  const agentService = new AgentService(db);
  const eventBus = new RunEventBus();
  const provider = new ClaudeAgentProvider();
  const runService = new RunService(db, agentService, skillRuntimeService, provider, eventBus);
  const scheduleService = new ScheduleService(db);
  const schedulerRunner = new SchedulerRunner(scheduleService, runService);

  app.addHook('onReady', async () => {
    skillService.syncMissingSkillsToDisabled();
    schedulerRunner.start();
  });

  app.post('/skills/sync', async (_request, reply) => {
    skillService.syncMissingSkillsToDisabled();
    return reply.send({ ok: true });
  });

  app.addHook('onClose', async () => {
    schedulerRunner.stop();
  });

  app.get('/health', async () => ({ ok: true }));

  app.get('/agents', async () => agentService.listEnabledAgents());
  app.post('/agents', async (request, reply) => {
    const payload = createAgentSchema.parse(request.body);
    agentService.saveAgent(payload);
    return reply.send({ ok: true });
  });

  app.get('/skills', async () => skillService.listEnabledSkills());
  app.post('/skills', async (request, reply) => {
    const payload = createSkillSchema.parse(request.body);
    skillService.saveSkill(payload);
    return reply.send({ ok: true });
  });
  app.put('/skills/:skillId/content', async (request, reply) => {
    const params = request.params as { skillId: string };
    const payload = updateSkillContentSchema.parse(request.body);
    skillService.updateSkillContent(params.skillId, payload.skillMdContent);
    return reply.send({ ok: true });
  });

  app.get('/mcps', async () => mcpService.listEnabled());
  app.post('/mcps', async (request, reply) => {
    const payload = createMcpSchema.parse(request.body);
    mcpService.saveMcp(payload);
    return reply.send({ ok: true });
  });

  app.get('/schedules', async () => scheduleService.listSchedules());
  app.post('/schedules', async (request, reply) => {
    const payload = createScheduleSchema.parse(request.body);
    scheduleService.saveSchedule(payload);
    schedulerRunner.stop();
    schedulerRunner.start();
    return reply.send({ ok: true });
  });

  app.post('/runs/web', async (request, reply) => {
    const payload = runWebSchema.parse(request.body);
    const result = await runService.execute({
      source: 'web',
      agentId: payload.agentId,
      prompt: payload.prompt,
      metadata: payload.metadata
    });
    return reply.send({ ok: true, runId: result.runId });
  });

  app.get('/runs/:runId', async (request, reply) => {
    const params = request.params as { runId: string };
    const run = db.runRepository.getById(params.runId);
    if (!run) {
      return reply.status(404).send({ ok: false, message: 'run 不存在' });
    }
    const events = db.runEventRepository.listByRunId(params.runId);
    return reply.send({ ok: true, run, events });
  });

  app.get('/ws/runs/:runId', { websocket: true }, (socket, request) => {
    const params = request.params as { runId: string };
    const unsubscribe = eventBus.subscribe(params.runId, (message) => {
      socket.send(JSON.stringify(message));
    });
    socket.on('close', () => unsubscribe());
  });

  return app;
}
