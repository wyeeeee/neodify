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
- 测试：Skill 文件服务、事件总线、Cron 校验
