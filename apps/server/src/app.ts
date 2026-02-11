import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createDbContext } from './db/index.js';
import {
  createAgentSchema,
  createConversationSchema,
  createMcpSchema,
  createSkillSchema,
  loginSchema,
  runWebSchema,
  updateSkillContentSchema
} from './types/api.js';
import { AgentService } from './modules/agents/agent-service.js';
import { ConversationService } from './modules/conversations/conversation-service.js';
import { McpService } from './modules/mcp/mcp-service.js';
import { RunEventBus } from './modules/runs/run-event-bus.js';
import { RunService } from './modules/runs/run-service.js';
import { SkillFileService } from './modules/skills/skill-file.service.js';
import { SkillRuntimeService } from './modules/skills/skill-runtime.service.js';
import { SkillService } from './modules/skills/skill-service.js';
import { ClaudeAgentProvider } from './providers/claude-agent-provider.js';
import { AuthService } from './modules/auth/auth-service.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: {
      username: string;
      expiresAt: string;
    };
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  const authService = new AuthService();

  const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.cwd(), process.env.DATABASE_URL)
    : undefined;
  const db = createDbContext(dbPath);

  const skillFileService = new SkillFileService();
  const skillRuntimeService = new SkillRuntimeService(skillFileService.getRepoRoot());
  const skillService = new SkillService(db, skillFileService);
  const mcpService = new McpService(db);
  const agentService = new AgentService(db);
  const conversationService = new ConversationService(db, skillFileService.getRepoRoot());
  const eventBus = new RunEventBus();
  const provider = new ClaudeAgentProvider();
  const runService = new RunService(db, agentService, conversationService, skillRuntimeService, provider, eventBus);

  app.addHook('onReady', async () => {
    skillService.syncMissingSkillsToDisabled();
  });

  const publicPaths = new Set(['/health', '/auth/login']);

  app.addHook('preHandler', async (request, reply) => {
    if (publicPaths.has(request.url.split('?')[0] ?? '')) {
      return;
    }
    const url = new URL(request.url, 'http://localhost');
    const token =
      authService.extractBearerToken(request.headers.authorization) ??
      url.searchParams.get('token');
    if (!token) {
      return reply.status(401).send({ ok: false, message: '未登录或 token 缺失' });
    }
    const principal = authService.verifyToken(token);
    if (!principal) {
      return reply.status(401).send({ ok: false, message: 'token 无效或已过期' });
    }
    request.authUser = {
      username: principal.username,
      expiresAt: principal.expiresAt.toISOString()
    };
  });

  app.post('/auth/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const session = authService.login(payload.username, payload.password);
    if (!session) {
      return reply.status(401).send({ ok: false, message: '账号或密码错误' });
    }
    return reply.send({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      username: payload.username
    });
  });

  app.get('/auth/me', async (request, reply) => {
    return reply.send({
      ok: true,
      user: request.authUser
    });
  });

  app.post('/skills/sync', async (_request, reply) => {
    skillService.syncMissingSkillsToDisabled();
    return reply.send({ ok: true });
  });

  app.post('/conversations', async (request, reply) => {
    const payload = createConversationSchema.parse(request.body);
    conversationService.createConversation(payload);
    return reply.send({ ok: true });
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

  app.post('/runs/web', async (request, reply) => {
    const payload = runWebSchema.parse(request.body);
    const result = await runService.execute({
      source: 'web',
      agentId: payload.agentId,
      conversationId: payload.conversationId,
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
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token') ?? authService.extractBearerToken(request.headers.authorization);
    if (!token || !authService.verifyToken(token)) {
      socket.close(4001, 'unauthorized');
      return;
    }
    const params = request.params as { runId: string };
    const unsubscribe = eventBus.subscribe(params.runId, (message) => {
      socket.send(JSON.stringify(message));
    });
    socket.on('close', () => unsubscribe());
  });

  return app;
}
