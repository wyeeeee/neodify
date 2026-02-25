import crypto from 'node:crypto';
import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createDbContext } from './db/index.js';
import {
  createAgentSchema,
  invokeRunSchema,
  createMcpSchema,
  createSkillSchema,
  loginSchema,
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

function safeEqualString(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseFirstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

function verifyServiceApiKey(providedApiKey: string | undefined, expectedApiKey: string | undefined): boolean {
  if (!providedApiKey || !expectedApiKey) {
    return false;
  }
  return safeEqualString(providedApiKey, expectedApiKey);
}

export async function buildApp() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = Fastify({
    logger: isProduction
      ? true
      : {
          level: process.env.LOG_LEVEL ?? 'info',
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname'
            }
          }
        }
  });
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
  const skillAutoSyncIntervalMs = Math.max(1000, Number(process.env.SKILL_AUTO_SYNC_INTERVAL_MS ?? 3000));
  let skillAutoSyncTimer: NodeJS.Timeout | null = null;
  const mcpService = new McpService(db);
  const agentService = new AgentService(db);
  const conversationService = new ConversationService(db, skillFileService.getRepoRoot());
  const eventBus = new RunEventBus();
  const provider = new ClaudeAgentProvider();
  const runService = new RunService(db, agentService, conversationService, skillRuntimeService, provider, eventBus);

  app.addHook('onReady', async () => {
    skillService.syncLocalSkillsToDatabase();
    skillAutoSyncTimer = setInterval(() => {
      try {
        skillService.syncLocalSkillsToDatabase();
      } catch (error) {
        app.log.warn({ error }, 'skill auto sync failed');
      }
    }, skillAutoSyncIntervalMs);
  });

  app.addHook('onClose', async () => {
    if (skillAutoSyncTimer) {
      clearInterval(skillAutoSyncTimer);
      skillAutoSyncTimer = null;
    }
  });

  const publicPaths = new Set(['/health', '/auth/login']);
  const servicePaths = new Set(['/runs/invoke']);

  app.addHook('preHandler', async (request, reply) => {
    const requestPath = request.url.split('?')[0] ?? '';
    if (publicPaths.has(requestPath)) {
      return;
    }

    const url = new URL(request.url, 'http://localhost');
    const token =
      authService.extractBearerToken(request.headers.authorization) ??
      url.searchParams.get('token');
    const principal = token ? authService.verifyToken(token) : null;

    const isServiceRoute =
      servicePaths.has(requestPath) || requestPath.startsWith('/runs/') || requestPath.startsWith('/ws/runs/');

    if (isServiceRoute) {
      const expectedApiKey = process.env.RUN_INVOKE_API_KEY?.trim();
      const providedApiKey = parseFirstHeaderValue(request.headers['x-api-key']);
      if (verifyServiceApiKey(providedApiKey, expectedApiKey)) {
        return;
      }
      if (principal) {
        request.authUser = {
          username: principal.username,
          expiresAt: principal.expiresAt.toISOString()
        };
        return;
      }
      if (!expectedApiKey) {
        return reply.status(500).send({ ok: false, message: 'RUN_INVOKE_API_KEY 未配置' });
      }
      return reply.status(401).send({ ok: false, message: '服务调用鉴权失败（X-API-Key 无效）' });
    }

    if (!token) {
      return reply.status(401).send({ ok: false, message: '未登录或 token 缺失' });
    }
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

  app.get('/health', async () => ({ ok: true }));

  app.get('/agents', async () => agentService.listAgents());
  app.get('/agents/:agentId', async (request, reply) => {
    const params = request.params as { agentId: string };
    const detail = agentService.getAgentDetail(params.agentId);
    if (!detail) {
      return reply.status(404).send({ ok: false, message: 'agent 不存在' });
    }
    return reply.send(detail);
  });
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

  app.post('/runs/invoke', async (request, reply) => {
    const payload = invokeRunSchema.parse(request.body);
    const result = await runService.execute({
      source: 'api',
      agentId: payload.agentId,
      conversationId: payload.conversationId,
      conversationTitle: payload.conversationTitle,
      prompt: payload.prompt,
      metadata: payload.metadata
    });
    return reply.send({ ok: true, runId: result.runId, conversationId: result.conversationId });
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
    const expectedApiKey = process.env.RUN_INVOKE_API_KEY?.trim();
    const url = new URL(request.url, 'http://localhost');
    const providedApiKey = parseFirstHeaderValue(request.headers['x-api-key']) ?? (url.searchParams.get('apiKey') ?? undefined);
    if (verifyServiceApiKey(providedApiKey, expectedApiKey)) {
      const params = request.params as { runId: string };
      const unsubscribe = eventBus.subscribe(params.runId, (message) => {
        socket.send(JSON.stringify(message));
      });
      socket.on('close', () => unsubscribe());
      return;
    }
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
