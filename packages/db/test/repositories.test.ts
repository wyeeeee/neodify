import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { createDbContext } from '../src/index.js';

const now = Date.now();

let dbPath = '';

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `neodify-db-${Date.now()}.sqlite`);
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
});

describe('db repositories', () => {
  test('agent repository can upsert and list enabled', () => {
    const db = createDbContext(dbPath);
    db.agentRepository.upsert({
      id: 'agent-1',
      name: '主Agent',
      enabled: true,
      model: 'claude-sonnet-4-5',
      systemPromptMd: '# 系统提示词',
      temperature: 0.2,
      maxTokens: 4000,
      createdAt: now,
      updatedAt: now
    });

    const agents = db.agentRepository.listEnabled();
    expect(agents).toHaveLength(1);
    expect(agents[0]?.name).toBe('主Agent');
  });

  test('run and event repositories can persist execution timeline', () => {
    const db = createDbContext(dbPath);
    db.runRepository.create({
      id: 'run-1',
      source: 'web',
      agentId: 'agent-1',
      conversationId: null,
      turnIndex: 1,
      sdkSessionId: null,
      status: 'running',
      inputJson: JSON.stringify({ text: 'hello' }),
      outputJson: null,
      errorMsg: null,
      startedAt: now,
      endedAt: null,
      latencyMs: null,
      costJson: JSON.stringify({ total_cost_usd: 0 })
    });

    db.runEventRepository.append('run-1', 1, 'run.started', JSON.stringify({ step: 'start' }), now);
    db.runRepository.finishSuccess(
      'run-1',
      JSON.stringify({ text: 'done' }),
      now + 500,
      500,
      JSON.stringify({ total_cost_usd: 0.001 })
    );

    const run = db.runRepository.getById('run-1');
    const events = db.runEventRepository.listByRunId('run-1');

    expect(run?.status).toBe('completed');
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('run.started');
  });

  test('conversation repository should persist and compute turn index', () => {
    const db = createDbContext(dbPath);
    const now = Date.now();

    db.conversationRepository.upsert({
      id: 'conv-1',
      agentId: 'agent-1',
      title: '测试会话',
      cwd: 'C:/tmp/conv-1',
      sdkSessionId: null,
      createdAt: now,
      updatedAt: now
    });

    db.runRepository.create({
      id: 'run-a',
      source: 'web',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      turnIndex: 1,
      sdkSessionId: 'session-1',
      status: 'completed',
      inputJson: '{}',
      outputJson: '{}',
      errorMsg: null,
      startedAt: now,
      endedAt: now,
      latencyMs: 1,
      costJson: '{}'
    });

    const turn = db.conversationRepository.nextTurnIndex('conv-1');
    expect(turn).toBe(2);
  });

  test('agent bindings can replace and list enabled skill/mcp ids', () => {
    const db = createDbContext(dbPath);
    db.agentSkillBindingRepository.replaceByAgent('agent-1', [
      { agentId: 'agent-1', skillId: 'skill-a', enabled: true, priority: 2 },
      { agentId: 'agent-1', skillId: 'skill-b', enabled: true, priority: 1 },
      { agentId: 'agent-1', skillId: 'skill-c', enabled: false, priority: 0 }
    ]);
    db.agentMcpBindingRepository.replaceByAgent('agent-1', [
      { agentId: 'agent-1', mcpId: 'mcp-a', enabled: true, priority: 5 },
      { agentId: 'agent-1', mcpId: 'mcp-b', enabled: true, priority: 1 }
    ]);

    const skillIds = db.agentSkillBindingRepository.listEnabledSkillIdsByAgent('agent-1');
    const mcpIds = db.agentMcpBindingRepository.listEnabledMcpIdsByAgent('agent-1');

    expect(skillIds).toEqual(['skill-b', 'skill-a']);
    expect(mcpIds).toEqual(['mcp-b', 'mcp-a']);
  });
});
