import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { describe, expect, test } from 'vitest';
import { ClaudeAgentProvider } from '../src/providers/claude-agent-provider.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(currentDir, '../.env') });

const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
const runLiveTest = hasApiKey ? test : test.skip;

describe('ClaudeAgentProvider live integration', () => {
  runLiveTest('should call claude model successfully', async () => {
    const provider = new ClaudeAgentProvider();
    const result = await provider.run({
      prompt: '请只回复字符串：OK',
      systemPrompt: '你是一个严格遵循输出要求的助手。',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
      maxTokens: 128,
      mcpList: [],
      cwd: path.resolve(currentDir, '..')
    });

    expect(result.sessionId).toBeTruthy();
    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);

    console.info('[live] sessionId:', result.sessionId);
    console.info('[live] totalCostUsd:', result.totalCostUsd);
    console.info('[live] reply:', result.text.trim());
  }, 120_000);
});
