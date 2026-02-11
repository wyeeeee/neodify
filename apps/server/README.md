# Server 模块说明

## 模块用途

`apps/server` 是后端服务模块，负责：

- 提供服务调用 API（Invoke）
- 执行 Agent 运行流程（通过 SDK 抽象层）
- 记录运行事件并通过 WebSocket 实时推送
- 管理 Agent、Skill、MCP 的后端逻辑

## 目录约定

- `src/main.ts`：服务启动入口
- `src/db/*`：内置数据库层（schema、repository、类型与初始化）
- `src/modules/*`：按领域拆分的业务模块
- `src/providers/*`：模型 SDK 适配层（支持后续替换）
- `test/*`：后端模块测试

## 当前已实现

- Fastify API：Agent / Skill / MCP / Run 的基础接口
- 运行相关接口：`POST /runs/invoke`、`GET /runs/:runId`、`GET /ws/runs/:runId`
- 运行相关接口优先使用 `X-API-Key`，同时兼容 Bearer Token（管理端调试）
- `POST /runs/invoke` 为异步受理接口：立即返回 `runId/conversationId`，执行结果通过查询与事件流获取
- SDK 抽象层：`AgentProvider` 接口 + `ClaudeAgentProvider` 实现（后续可替换）
- Run 执行链路：Run 入库、事件入库、执行状态更新
- WebSocket 实时事件：`/ws/runs/:runId`
- Skill 官方接入：运行时投影到 `.runtime/runs/<runId>/.claude/skills/*/SKILL.md` 并由 SDK 官方参数加载
- Skill 同步：本地文件缺失时自动将数据库 Skill 标记为 `disabled`
- 多轮会话：`/runs/invoke` 自动创建或复用 `conversation`，并复用 SDK session（`resume`）
- 每轮新 Run：同一会话下每次用户消息都会创建新 run 记录（turn_index 递增）
- 会话级 Skill 复用：Skill 投影到 `.runtime/conversations/<conversationId>/.claude/skills`
- Claude SDK 已切换至稳定 V1 `query` 调用通道（支持 `cwd`、`resume`、`mcpServers`、`systemPrompt`）
- 单用户登录鉴权：`/auth/login` + Bearer Token 保护管理类 API
- 测试：DB 仓储、鉴权、Skill 文件服务、事件总线

## 环境变量

请在根目录 `env/server` 下配置：

- `env/server/.env.development`
- `env/server/.env.production`

可从 `env/server/.env.*.example` 复制后修改：

- `ANTHROPIC_API_KEY`：Anthropic API Key（必填）
- `DATABASE_URL`：SQLite 文件路径（相对 `apps/server`）
- `HOST`：监听地址（默认 `0.0.0.0`）
- `PORT`：监听端口（默认 `3000`）
- `AUTH_USERNAME`：登录账号（必填）
- `AUTH_PASSWORD`：登录密码（必填）
- `AUTH_TOKEN_SECRET`：Token 签名密钥（必填）
- `AUTH_TOKEN_TTL_SEC`：Token 有效期秒数（默认 `86400`）
- `RUN_INVOKE_API_KEY`：服务调用入口 `/runs/invoke` 的 API Key（必填）

## 测试命令

- 单元/模块测试：`npm run test -w @neodify/server`
- 真实模型联调测试：`npm run test:live -w @neodify/server`
- `test:live` 会输出 `sessionId`、`totalCostUsd` 与模型回复正文，便于直接核对真实返回
- `test:live` 默认读取 `env/server/.env.development`
