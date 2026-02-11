import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { createDbContext } from '../src/db/index.js';
import { ConversationService } from '../src/modules/conversations/conversation-service.js';

let dbPath = '';

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `neodify-conv-${Date.now()}.sqlite`);
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
});

describe('ConversationService', () => {
  test('should create and fetch conversation', () => {
    const db = createDbContext(dbPath);
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const service = new ConversationService(db, repoRoot);
    service.createConversation({ id: 'conv-1', agentId: 'agent-1', title: '会话A' });

    const conversation = service.getConversation('conv-1');
    expect(conversation?.id).toBe('conv-1');
    expect(conversation?.cwd).toContain('.runtime');
  });

  test('should auto create conversation when missing id', () => {
    const db = createDbContext(dbPath);
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const service = new ConversationService(db, repoRoot);

    const conversation = service.ensureConversation({
      agentId: 'agent-1',
      title: '自动创建会话'
    });

    expect(conversation.id.startsWith('conv_')).toBe(true);
    expect(conversation.agentId).toBe('agent-1');
  });

  test('should auto create conversation when id not exists', () => {
    const db = createDbContext(dbPath);
    const repoRoot = path.resolve(process.cwd(), '..', '..');
    const service = new ConversationService(db, repoRoot);

    const conversation = service.ensureConversation({
      conversationId: 'conv-external-001',
      agentId: 'agent-1',
      title: '外部ID会话'
    });

    expect(conversation.id).toBe('conv-external-001');
    expect(conversation.title).toBe('外部ID会话');
  });
});
