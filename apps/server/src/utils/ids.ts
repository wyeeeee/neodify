import crypto from 'node:crypto';

export function createRunId(): string {
  return `run_${crypto.randomUUID()}`;
}

export function createConversationId(): string {
  return `conv_${crypto.randomUUID()}`;
}
