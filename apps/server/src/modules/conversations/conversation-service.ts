import path from 'node:path';
import type { DbContext } from '../../db/index.js';

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
