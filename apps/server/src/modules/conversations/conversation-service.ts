import path from 'node:path';
import type { DbContext } from '../../db/index.js';
import { createConversationId } from '../../utils/ids.js';

export class ConversationService {
  constructor(private readonly db: DbContext, private readonly repoRoot: string) {}

  createConversation(input: { id: string; agentId: string; title: string }): void {
    const now = Date.now();
    const cwd = path.resolve(this.repoRoot, '.runtime', 'conversations', input.id);
    this.db.conversationRepository.upsert({
      id: input.id,
      agentId: input.agentId,
      title: input.title,
      cwd,
      sdkSessionId: null,
      createdAt: now,
      updatedAt: now
    });
  }

  ensureConversation(input: { conversationId?: string; agentId: string; title?: string }): {
    id: string;
    agentId: string;
    title: string;
    cwd: string;
    sdkSessionId: string | null;
    createdAt: number;
    updatedAt: number;
  } {
    if (input.conversationId) {
      const existed = this.getConversation(input.conversationId);
      if (existed) {
        return existed;
      }
      const now = Date.now();
      const title = input.title ?? `会话-${new Date(now).toISOString()}`;
      this.createConversation({
        id: input.conversationId,
        agentId: input.agentId,
        title
      });
      return this.getConversation(input.conversationId)!;
    }

    const conversationId = createConversationId();
    const now = Date.now();
    const title = input.title ?? `会话-${new Date(now).toISOString()}`;
    this.createConversation({
      id: conversationId,
      agentId: input.agentId,
      title
    });
    return this.getConversation(conversationId)!;
  }

  getConversation(conversationId: string) {
    return this.db.conversationRepository.getById(conversationId);
  }

  nextTurnIndex(conversationId: string): number {
    return this.db.conversationRepository.nextTurnIndex(conversationId);
  }

  updateSessionId(conversationId: string, sessionId: string | null): void {
    this.db.conversationRepository.updateSessionId(conversationId, sessionId);
  }
}
