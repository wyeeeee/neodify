# Neodify 当前规划（管理后端 + 运行能力后端）

## 1. 产品定位

Neodify 当前阶段定位为：

- **管理后端**：管理 Agent、Skill、MCP 等运行配置。
- **运行能力后端**：对外提供统一调用入口、会话能力与运行日志查询能力。

Neodify 不是调度系统，不负责任务编排与分发。

## 2. 职责边界

### 2.1 Neodify 负责

- 提供运行调用接口：`POST /runs/invoke`
- 提供运行查询能力：`GET /runs/:runId`
- 提供运行事件流：`GET /ws/runs/:runId`
- 在 `runs/invoke` 内自动创建/复用会话（conversation）
- 提供 Agent / Skill / MCP 的管理接口

### 2.2 外部服务负责

- 调度触发（Cron/消息队列/业务事件）
- 编排策略（重试、并发、优先级、超时控制）
- 业务工作流状态机与补偿逻辑

## 3. 当前架构

### 3.1 后端（核心）

- 技术栈：Node.js + TypeScript + Fastify
- 运行引擎：Claude Agent SDK（经 provider 抽象）
- 数据存储：SQLite（`apps/server/src/db`）

### 3.2 前端（管理端）

- 技术栈：Vue 3 + TypeScript
- 目标：提供 Agent / Skill / MCP 管理能力与运行可视化

## 4. 数据模型（当前）

- `agents`
- `skills`
- `mcps`
- `agent_skills`
- `agent_mcps`
- `conversations`
- `runs`（`source = api`）
- `run_events`

说明：调度相关表与调度器逻辑已移除。

## 5. 鉴权模型（当前）

### 5.1 运行接口鉴权

用于运行链路接口：

- `POST /runs/invoke`
- `GET /runs/:runId`
- `GET /ws/runs/:runId`

支持两种凭证：

- `X-API-Key`（推荐，服务调用）
- Bearer Token（管理端兼容）

### 5.2 管理接口鉴权

用于管理类接口：

- `POST /auth/login` 登录
- `Authorization: Bearer <token>` 访问管理接口

## 6. 实施里程碑（更新）

### M1：后端边界重构（已完成）

- 去除调度器概念与相关代码
- 运行入口统一为服务调用语义（`/runs/invoke`）
- 运行来源统一为 `source=api`

### M2：单入口自动会话（已完成）

- 删除显式会话创建接口
- 在 `/runs/invoke` 内自动创建/复用会话
- `runs/invoke` 响应返回 `conversationId`

### M3：接口规范化（进行中）

- 明确接口契约、鉴权、错误码
- 提供服务对接文档与调用示例

### M4：管理能力完善

- Agent 管理增强（参数校验、可用性检查）
- Skill 管理增强（编辑校验、文件一致性）
- MCP 管理增强（配置校验、连通性检查）

### M5：运行可观测性增强

- 运行事件标准化
- run 查询聚合视图
- WebSocket 断线重连与回放策略

## 7. 验收标准

- 外部服务可通过 `X-API-Key` 稳定调用运行链路
- 管理端可稳定维护 Agent / Skill / MCP 配置
- run 与 run_events 可完整追踪一次调用全过程
- 项目内无调度器、Cron、Schedule 相关后端概念
- 不传 `conversationId` 时，`/runs/invoke` 可自动创建会话并返回
