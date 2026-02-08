import type { DbContext } from '@neodify/db';
import type { CreateMcpDto } from '../../types/api.js';
import type { McpConfig } from '../../types/domain.js';

export class McpService {
  constructor(private readonly db: DbContext) {}

  saveMcp(input: CreateMcpDto): void {
    const now = Date.now();
    this.db.mcpRepository.upsert({
      id: input.id,
      name: input.name,
      mode: input.mode,
      enabled: input.enabled,
      endpoint: input.endpoint,
      command: input.command,
      argsJson: JSON.stringify(input.args),
      envJson: JSON.stringify(input.env),
      headersJson: JSON.stringify(input.headers),
      authConfigJson: JSON.stringify(input.authConfig),
      timeoutMs: input.timeoutMs,
      createdAt: now,
      updatedAt: now
    });
  }

  listEnabled(): McpConfig[] {
    return this.db.mcpRepository.listEnabled().map((item) => ({
      id: item.id,
      name: item.name,
      mode: item.mode,
      enabled: item.enabled,
      endpoint: item.endpoint,
      command: item.command,
      args: JSON.parse(item.argsJson) as string[],
      env: JSON.parse(item.envJson) as Record<string, string>,
      headers: JSON.parse(item.headersJson) as Record<string, string>,
      authConfig: JSON.parse(item.authConfigJson) as Record<string, unknown>,
      timeoutMs: item.timeoutMs
    }));
  }
}

