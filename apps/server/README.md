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

