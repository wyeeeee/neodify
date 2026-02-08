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
});
