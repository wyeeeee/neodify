# Neodify V1 设计计划（精简版）

## 1. 目标范围

本阶段只做可直接上线使用的单用户系统：

- 输入模式仅一种：`服务接口输入（API Invoke）`
- 技术栈：`TypeScript + Vue 3`
- 提供完整 Web 界面
- 实时查看完整执行日志（输入、模型响应、Tool/MCP 调用、错误、耗时）
- 支持多个 Agent，每个 Agent 独立配置 Skill 与 MCP
- Skill 严格遵循 Anthropic Skill 规范（`SKILL.md`）
- MCP 支持在线配置：`http`、`sse`、`uvx`、`npx`
- 数据库统一使用 SQLite，数据层内聚在 `apps/server/src/db`

明确不做：

- 不做工作流编排器（DAG）
- 不做版本控制（Skill/Prompt 只保留当前稿）
- 不做数据库迁移脚本与兼容层
- 不做 MCP 权限管理
- 数据库切换采用破坏式重建，不做向后兼容

---

## 2. Skill 标准格式（遵循 Anthropic Skill 规范）

Skill 使用目录作为最小单元，目录结构如下：

- `skills/<skill_name>/SKILL.md`

规范要求（V1 约束）：

- `SKILL.md` 为必需文件，按 Anthropic Skill 规范编写
- `SKILL.md` 用于描述 Skill 的触发场景与执行指引
- 可按需包含 `scripts/`、`references/`、`assets/` 等子目录
- 运行时由系统读取 `SKILL.md` 并装配 Skill 元信息

说明：

- 具体字段与细节以 Anthropic 官方 Skill 文档为准；若官方规范更新，系统同步跟随

Neodify 中的在线 Skill 管理将围绕这个格式：

- 在线新建 Skill：创建 `skills/<skill_name>/SKILL.md`
- 在线编辑 Skill：编辑 `SKILL.md` 及附属文件
- 在线预览 Skill：渲染 `SKILL.md` 并执行基础校验

---

## 3. Prompt Studio（Agent 提示词编写）

每个 Agent 提供独立 Prompt Studio：

- Markdown 编辑器
- Markdown 实时渲染预览
- 代码块语法高亮
- 变量占位符插入辅助
- 一键试跑（直接触发一次 run）

V1 规则：

- Prompt 仅保留当前生效稿
- 保存后立即对后续运行生效

---

## 4. 架构设计

### 4.1 分层

1. Frontend（Vue3 + TS）
   - Chat
   - Skills
   - MCPs
   - Runs / Run Detail（实时）
   - Prompt Studio

2. Backend（Node.js + TS）
   - Input Adapter（API Invoke）
   - Agent Runtime（Claude Agent SDK）
   - Skill Loader（读取 SKILL.md）
   - MCP Connector（http/sse/uvx/npx）
   - Event Bus + WebSocket

3. Storage
   - SQLite（内置 repository）
   - Redis（可选，用于发布订阅与队列）

### 4.2 主链路

`输入事件 -> Agent 选择 -> 载入 Prompt + Skills + MCP -> Claude Agent SDK 执行 -> 事件入库 -> WebSocket 推送 -> 返回结果`

---

## 5. 数据模型（V1）

- `agents`
  - `id`, `name`, `enabled`, `model`, `system_prompt_md`, `temperature`, `max_tokens`, `created_at`, `updated_at`

- `skills`
  - `id`, `name`, `root_path`, `skill_md_path`, `enabled`, `created_at`, `updated_at`

- `mcps`
  - `id`, `name`, `mode(http|sse|uvx|npx)`, `enabled`, `endpoint`, `command`, `args_json`, `env_json`, `headers_json`, `auth_config_json`, `timeout_ms`, `created_at`, `updated_at`

- `agent_skills`
  - `agent_id`, `skill_id`, `enabled`, `priority`

- `agent_mcps`
  - `agent_id`, `mcp_id`, `enabled`, `priority`

- `runs`
  - `id`, `source(api)`, `agent_id`, `status`, `input_json`, `output_json`, `error_msg`, `started_at`, `ended_at`, `latency_ms`, `cost_json`

- `run_events`
  - `id`, `run_id`, `seq`, `event_type`, `payload_json`, `created_at`

---

## 6. 后端模块

- `apps/server/src/modules/adapters`
  - `web.adapter.ts`

- `apps/server/src/modules/agents`
  - `agent.registry.ts`
  - `agent.runtime.ts`

- `apps/server/src/modules/skills`
  - `skill.service.ts`
  - `skill-loader.service.ts`
  - `skill-editor.service.ts`

- `apps/server/src/modules/prompts`
  - `prompt.service.ts`
  - `prompt-preview.service.ts`

- `apps/server/src/modules/mcp`
  - `mcp.service.ts`
  - `mcp-connector.http.ts`
  - `mcp-connector.sse.ts`
  - `mcp-connector.command.ts`

- `apps/server/src/modules/execution`
  - `run.service.ts`
  - `event.service.ts`

- `apps/server/src/db`
  - `schema.ts`
  - `client.ts`
  - `repositories.ts`
  - `types.ts`

---

## 7. 前端模块

- `apps/web/src/pages/chat`
  - 对话输入、Agent 选择、流式输出、事件流

- `apps/web/src/pages/skills`
  - Skill 列表、SKILL.md 编辑、结构预览

- `apps/web/src/pages/prompts`
  - Prompt Studio（Markdown + 高亮 + 预览 + 试跑）

- `apps/web/src/pages/mcps`
  - MCP 列表、模式化配置（http/sse/uvx/npx）、连通性测试

- `apps/web/src/pages/runs`
  - 运行记录筛选

- `apps/web/src/pages/run-detail`
  - 时间线回放 + 实时增量

---

## 8. 实时日志

标准事件：

- `run.started`
- `agent.input.received`
- `agent.tool.call`
- `agent.tool.result`
- `agent.output.generated`
- `run.failed`
- `run.completed`

策略：

- 先写 `run_events`
- 再推送 `ws: run:{runId}`
- 前端先拉历史再订阅实时

---

## 9. 安全边界（按你的要求精简）

- 敏感配置走 `.env`，禁止硬编码
- Skill 编辑仅允许 `skills/` 根目录内读写（防路径穿越）
- `uvx/npx` 执行设置超时与参数长度限制
- 不实现 MCP 权限管理（V1）

---

## 10. 里程碑

### M1：基础脚手架

- Monorepo 初始化（Web/Server/DB）
- SQLite 数据层跑通（`apps/server/src/db`）
- 基础表：agents/skills/mcps/runs/run_events

### M2：服务调用输入闭环

- Invoke API -> Claude Agent SDK -> run_events -> 前端实时展示

### M3：Skill 管理（标准 SKILL.md）

- Skill 新建/编辑/预览
- Skill Loader 按标准目录装配
- Agent 绑定 Skill

### M4：Prompt Studio

- Markdown 编辑/预览/高亮
- 变量插入
- 一键试跑

### M5：MCP 在线配置

- http/sse/uvx/npx 配置
- 连通性测试
- Agent 绑定 MCP 并运行

### M6：数据库重建切换策略

- SQLite 阶段按当前 schema 运行
- 切换数据库时采用破坏式重建（重新建库建表）
- 不提供跨库迁移与兼容脚本

---

## 11. 验收标准

- Skill 使用标准 `skills/<skill_name>/SKILL.md` 结构并可在线管理
- 可创建多个 Agent，分别绑定 Skill 与 MCP
- Prompt Studio 可完成 Markdown 编辑、预览和高亮
- MCP 支持 `http/sse/uvx/npx` 在线配置与连通性测试
- 服务接口输入可触发运行
- 运行全过程可在 UI 实时查看与回放
