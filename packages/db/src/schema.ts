import type Database from 'better-sqlite3';

const ddl = [
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    model TEXT NOT NULL,
    system_prompt_md TEXT NOT NULL,
    temperature REAL NOT NULL,
    max_tokens INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL,
    skill_md_path TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS mcps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    endpoint TEXT,
    command TEXT,
    args_json TEXT NOT NULL,
    env_json TEXT NOT NULL,
    headers_json TEXT NOT NULL,
    auth_config_json TEXT NOT NULL,
    timeout_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS agent_skills (
    agent_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    priority INTEGER NOT NULL,
    PRIMARY KEY (agent_id, skill_id)
  );`,
  `CREATE TABLE IF NOT EXISTS agent_mcps (
    agent_id TEXT NOT NULL,
    mcp_id TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    priority INTEGER NOT NULL,
    PRIMARY KEY (agent_id, mcp_id)
  );`,
  `CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    input_template_json TEXT NOT NULL,
    enabled INTEGER NOT NULL,
    next_run_at INTEGER,
    last_run_at INTEGER
  );`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT,
    error_msg TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    latency_ms INTEGER,
    cost_json TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS run_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_run_events_run_id_seq ON run_events (run_id, seq);`
];

export function initializeSchema(db: Database.Database): void {
  for (const sql of ddl) {
    db.prepare(sql).run();
  }
}

