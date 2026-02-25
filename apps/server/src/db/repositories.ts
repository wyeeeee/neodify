import type Database from 'better-sqlite3';
import type {
  AgentRecord,
  AgentMcpBindingRecord,
  AgentSkillBindingRecord,
  ConversationRecord,
  McpRecord,
  RunEventRecord,
  RunRecord,
  SkillRecord
} from './types.js';

export class AgentRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(agent: AgentRecord): void {
    this.db
      .prepare(
        `INSERT INTO agents (
          id, name, enabled, model, system_prompt_md, temperature, max_tokens, created_at, updated_at
        ) VALUES (
          @id, @name, @enabled, @model, @systemPromptMd, @temperature, @maxTokens, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          enabled = excluded.enabled,
          model = excluded.model,
          system_prompt_md = excluded.system_prompt_md,
          temperature = excluded.temperature,
          max_tokens = excluded.max_tokens,
          updated_at = excluded.updated_at;`
      )
      .run({
        ...agent,
        enabled: agent.enabled ? 1 : 0
      });
  }

  listEnabled(): AgentRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM agents WHERE enabled = 1 ORDER BY name ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      enabled: Number(row.enabled) === 1,
      model: String(row.model),
      systemPromptMd: String(row.system_prompt_md),
      temperature: Number(row.temperature),
      maxTokens: Number(row.max_tokens),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  listAll(): AgentRecord[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY name ASC').all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      enabled: Number(row.enabled) === 1,
      model: String(row.model),
      systemPromptMd: String(row.system_prompt_md),
      temperature: Number(row.temperature),
      maxTokens: Number(row.max_tokens),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  getById(agentId: string): AgentRecord | null {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      name: String(row.name),
      enabled: Number(row.enabled) === 1,
      model: String(row.model),
      systemPromptMd: String(row.system_prompt_md),
      temperature: Number(row.temperature),
      maxTokens: Number(row.max_tokens),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}

export class SkillRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(skill: SkillRecord): void {
    this.db
      .prepare(
        `INSERT INTO skills (
          id, name, root_path, skill_md_path, enabled, created_at, updated_at
        ) VALUES (
          @id, @name, @rootPath, @skillMdPath, @enabled, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          root_path = excluded.root_path,
          skill_md_path = excluded.skill_md_path,
          enabled = excluded.enabled,
          updated_at = excluded.updated_at;`
      )
      .run({
        ...skill,
        enabled: skill.enabled ? 1 : 0
      });
  }

  listEnabled(): SkillRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM skills WHERE enabled = 1 ORDER BY name ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      rootPath: String(row.root_path),
      skillMdPath: String(row.skill_md_path),
      enabled: Number(row.enabled) === 1,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  listAll(): SkillRecord[] {
    const rows = this.db.prepare('SELECT * FROM skills ORDER BY name ASC').all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      rootPath: String(row.root_path),
      skillMdPath: String(row.skill_md_path),
      enabled: Number(row.enabled) === 1,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  getById(skillId: string): SkillRecord | null {
    const row = this.db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      name: String(row.name),
      rootPath: String(row.root_path),
      skillMdPath: String(row.skill_md_path),
      enabled: Number(row.enabled) === 1,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}

export class McpRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(mcp: McpRecord): void {
    this.db
      .prepare(
        `INSERT INTO mcps (
          id, name, mode, enabled, endpoint, command, args_json, env_json, headers_json, auth_config_json,
          timeout_ms, created_at, updated_at
        ) VALUES (
          @id, @name, @mode, @enabled, @endpoint, @command, @argsJson, @envJson, @headersJson, @authConfigJson,
          @timeoutMs, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          mode = excluded.mode,
          enabled = excluded.enabled,
          endpoint = excluded.endpoint,
          command = excluded.command,
          args_json = excluded.args_json,
          env_json = excluded.env_json,
          headers_json = excluded.headers_json,
          auth_config_json = excluded.auth_config_json,
          timeout_ms = excluded.timeout_ms,
          updated_at = excluded.updated_at;`
      )
      .run({
        ...mcp,
        enabled: mcp.enabled ? 1 : 0
      });
  }

  listEnabled(): McpRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM mcps WHERE enabled = 1 ORDER BY name ASC')
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      mode: row.mode as McpRecord['mode'],
      enabled: Number(row.enabled) === 1,
      endpoint: row.endpoint ? String(row.endpoint) : null,
      command: row.command ? String(row.command) : null,
      argsJson: String(row.args_json),
      envJson: String(row.env_json),
      headersJson: String(row.headers_json),
      authConfigJson: String(row.auth_config_json),
      timeoutMs: Number(row.timeout_ms),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }));
  }

  getById(mcpId: string): McpRecord | null {
    const row = this.db.prepare('SELECT * FROM mcps WHERE id = ?').get(mcpId) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      name: String(row.name),
      mode: row.mode as McpRecord['mode'],
      enabled: Number(row.enabled) === 1,
      endpoint: row.endpoint ? String(row.endpoint) : null,
      command: row.command ? String(row.command) : null,
      argsJson: String(row.args_json),
      envJson: String(row.env_json),
      headersJson: String(row.headers_json),
      authConfigJson: String(row.auth_config_json),
      timeoutMs: Number(row.timeout_ms),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }
}

export class AgentSkillBindingRepository {
  constructor(private readonly db: Database.Database) {}

  replaceByAgent(agentId: string, bindings: AgentSkillBindingRecord[]): void {
    const tx = this.db.transaction((targetAgentId: string, rows: AgentSkillBindingRecord[]) => {
      this.db.prepare('DELETE FROM agent_skills WHERE agent_id = ?').run(targetAgentId);
      const stmt = this.db.prepare(
        'INSERT INTO agent_skills (agent_id, skill_id, enabled, priority) VALUES (@agentId, @skillId, @enabled, @priority)'
      );
      for (const binding of rows) {
        stmt.run({
          ...binding,
          enabled: binding.enabled ? 1 : 0
        });
      }
    });
    tx(agentId, bindings);
  }

  listEnabledSkillIdsByAgent(agentId: string): string[] {
    const rows = this.db
      .prepare(
        'SELECT skill_id FROM agent_skills WHERE agent_id = ? AND enabled = 1 ORDER BY priority ASC, skill_id ASC'
      )
      .all(agentId) as Array<Record<string, unknown>>;
    return rows.map((row) => String(row.skill_id));
  }
}

export class AgentMcpBindingRepository {
  constructor(private readonly db: Database.Database) {}

  replaceByAgent(agentId: string, bindings: AgentMcpBindingRecord[]): void {
    const tx = this.db.transaction((targetAgentId: string, rows: AgentMcpBindingRecord[]) => {
      this.db.prepare('DELETE FROM agent_mcps WHERE agent_id = ?').run(targetAgentId);
      const stmt = this.db.prepare(
        'INSERT INTO agent_mcps (agent_id, mcp_id, enabled, priority) VALUES (@agentId, @mcpId, @enabled, @priority)'
      );
      for (const binding of rows) {
        stmt.run({
          ...binding,
          enabled: binding.enabled ? 1 : 0
        });
      }
    });
    tx(agentId, bindings);
  }

  listEnabledMcpIdsByAgent(agentId: string): string[] {
    const rows = this.db
      .prepare('SELECT mcp_id FROM agent_mcps WHERE agent_id = ? AND enabled = 1 ORDER BY priority ASC, mcp_id ASC')
      .all(agentId) as Array<Record<string, unknown>>;
    return rows.map((row) => String(row.mcp_id));
  }
}

export class RunRepository {
  constructor(private readonly db: Database.Database) {}

  create(run: RunRecord): void {
    this.db
      .prepare(
        `INSERT INTO runs (
          id, source, agent_id, conversation_id, turn_index, sdk_session_id, status, input_json, output_json, error_msg,
          started_at, ended_at, latency_ms, cost_json
        ) VALUES (
          @id, @source, @agentId, @conversationId, @turnIndex, @sdkSessionId, @status, @inputJson, @outputJson, @errorMsg,
          @startedAt, @endedAt, @latencyMs, @costJson
        );`
      )
      .run(run);
  }

  finishSuccess(runId: string, outputJson: string, endedAt: number, latencyMs: number, costJson: string): void {
    this.db
      .prepare(
        `UPDATE runs
         SET status = 'completed', output_json = @outputJson, ended_at = @endedAt, latency_ms = @latencyMs, cost_json = @costJson
         WHERE id = @runId;`
      )
      .run({ runId, outputJson, endedAt, latencyMs, costJson });
  }

  finishFailure(runId: string, errorMsg: string, endedAt: number, latencyMs: number): void {
    this.db
      .prepare(
        `UPDATE runs
         SET status = 'failed', error_msg = @errorMsg, ended_at = @endedAt, latency_ms = @latencyMs
         WHERE id = @runId;`
      )
      .run({ runId, errorMsg, endedAt, latencyMs });
  }

  updateSdkSessionId(runId: string, sdkSessionId: string | null): void {
    this.db.prepare('UPDATE runs SET sdk_session_id = ? WHERE id = ?').run(sdkSessionId, runId);
  }

  getById(runId: string): RunRecord | null {
    const row = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      source: row.source as RunRecord['source'],
      agentId: String(row.agent_id),
      conversationId: row.conversation_id ? String(row.conversation_id) : null,
      turnIndex: Number(row.turn_index),
      sdkSessionId: row.sdk_session_id ? String(row.sdk_session_id) : null,
      status: row.status as RunRecord['status'],
      inputJson: String(row.input_json),
      outputJson: row.output_json ? String(row.output_json) : null,
      errorMsg: row.error_msg ? String(row.error_msg) : null,
      startedAt: Number(row.started_at),
      endedAt: row.ended_at === null ? null : Number(row.ended_at),
      latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
      costJson: String(row.cost_json)
    };
  }
}

export class ConversationRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(conversation: ConversationRecord): void {
    this.db
      .prepare(
        `INSERT INTO conversations (
          id, agent_id, title, cwd, sdk_session_id, created_at, updated_at
        ) VALUES (
          @id, @agentId, @title, @cwd, @sdkSessionId, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          agent_id = excluded.agent_id,
          title = excluded.title,
          cwd = excluded.cwd,
          sdk_session_id = excluded.sdk_session_id,
          updated_at = excluded.updated_at;`
      )
      .run(conversation);
  }

  getById(conversationId: string): ConversationRecord | null {
    const row = this.db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(conversationId) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      agentId: String(row.agent_id),
      title: String(row.title),
      cwd: String(row.cwd),
      sdkSessionId: row.sdk_session_id ? String(row.sdk_session_id) : null,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }

  nextTurnIndex(conversationId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(turn_index), 0) AS max_turn FROM runs WHERE conversation_id = ?')
      .get(conversationId) as Record<string, unknown>;
    return Number(row.max_turn) + 1;
  }

  updateSessionId(conversationId: string, sdkSessionId: string | null): void {
    this.db
      .prepare('UPDATE conversations SET sdk_session_id = ?, updated_at = ? WHERE id = ?')
      .run(sdkSessionId, Date.now(), conversationId);
  }
}

export class RunEventRepository {
  constructor(private readonly db: Database.Database) {}

  append(runId: string, seq: number, eventType: string, payloadJson: string, createdAt: number): void {
    this.db
      .prepare(
        `INSERT INTO run_events (run_id, seq, event_type, payload_json, created_at)
         VALUES (@runId, @seq, @eventType, @payloadJson, @createdAt);`
      )
      .run({ runId, seq, eventType, payloadJson, createdAt });
  }

  listByRunId(runId: string): RunEventRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM run_events WHERE run_id = ? ORDER BY seq ASC')
      .all(runId) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: Number(row.id),
      runId: String(row.run_id),
      seq: Number(row.seq),
      eventType: String(row.event_type),
      payloadJson: String(row.payload_json),
      createdAt: Number(row.created_at)
    }));
  }
}
