# Server 模块说明

## 模块用途

`apps/server` 是后端服务模块，负责：

- 提供 Web 输入与定时输入 API
- 执行 Agent 运行流程（通过 SDK 抽象层）
- 记录运行事件并通过 WebSocket 实时推送
- 管理 Agent、Skill、MCP、Schedule 的后端逻辑

## 目录约定

- `src/main.ts`：服务启动入口
- `src/modules/*`：按领域拆分的业务模块
- `src/providers/*`：模型 SDK 适配层（支持后续替换）
- `test/*`：后端模块测试

## 当前已实现

- Fastify API：Agent / Skill / MCP / Schedule / Run 的基础接口
- SDK 抽象层：`AgentProvider` 接口 + `ClaudeAgentProvider` 实现（后续可替换）
- Run 执行链路：Run 入库、事件入库、执行状态更新
- WebSocket 实时事件：`/ws/runs/:runId`
- 定时任务：基于 `node-cron` 的 schedule 执行器
- Skill 官方接入：运行时投影到 `.runtime/runs/<runId>/.claude/skills/*/SKILL.md` 并由 SDK 官方参数加载
- Skill 同步：本地文件缺失时自动将数据库 Skill 标记为 `disabled`
- 多轮会话：`conversation` 维度复用 SDK session（`resume`）
- 每轮新 Run：同一会话下每次用户消息都会创建新 run 记录（turn_index 递增）
- 会话级 Skill 复用：Skill 投影到 `.runtime/conversations/<conversationId>/.claude/skills`
- Claude SDK 已破坏性切换至 TypeScript V2（`createSession/resumeSession/send/stream`）
- 测试：Skill 文件服务、事件总线、Cron 校验

## 环境变量

请在 `apps/server/.env` 中配置（可从 `apps/server/.env.example` 复制）：

- `ANTHROPIC_API_KEY`：Anthropic API Key（必填）
- `DATABASE_URL`：SQLite 文件路径（相对 `apps/server`）
- `HOST`：监听地址（默认 `0.0.0.0`）
- `PORT`：监听端口（默认 `3000`）

## 测试命令

- 单元/模块测试：`npm run test -w @neodify/server`
- 真实模型联调测试：`npm run test:live -w @neodify/server`
- `test:live` 会输出 `sessionId`、`totalCostUsd` 与模型回复正文，便于直接核对真实返回
