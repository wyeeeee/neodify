# Neodify 后端 API 规范

## 1. 定位与边界

Neodify 后端是“管理后端 + 运行能力后端”：

- 管理后端：负责 Agent / Skill / MCP 配置管理。
- 运行能力后端：对外提供统一运行调用与运行追踪能力。

调度、编排、重试、分发由外部服务负责，Neodify 不承担。

## 2. 基础信息

- Base URL：`http://<host>:<port>`
- Content-Type：`application/json`
- 时间字段：Unix 毫秒时间戳（number）

## 3. 鉴权模型

### 3.1 运行接口鉴权

运行相关接口支持两种凭证：

- 服务调用：`X-API-Key: <RUN_INVOKE_API_KEY>`（推荐）
- 管理端兼容：`Authorization: Bearer <token>`

运行相关接口：

- `POST /runs/invoke`
- `GET /runs/:runId`
- `GET /ws/runs/:runId`

### 3.2 管理接口鉴权

- 先 `POST /auth/login` 获取 token
- 管理接口使用 `Authorization: Bearer <token>`

公共接口：

- `GET /health`
- `POST /auth/login`

## 4. 接口清单

### 4.1 健康检查

#### `GET /health`

- 鉴权：无需
- 响应：

```json
{ "ok": true }
```

### 4.2 认证

#### `POST /auth/login`

- 鉴权：无需
- 请求体：

```json
{
  "username": "admin",
  "password": "your_password"
}
```

- 响应：

```json
{
  "ok": true,
  "token": "...",
  "expiresAt": "2026-02-12T10:00:00.000Z",
  "username": "admin"
}
```

#### `GET /auth/me`

- 鉴权：Bearer Token
- 响应：

```json
{
  "ok": true,
  "user": {
    "username": "admin",
    "expiresAt": "2026-02-12T10:00:00.000Z"
  }
}
```

### 4.3 Agent 管理

#### `GET /agents`

- 鉴权：Bearer Token
- 说明：返回已启用 Agent 列表

#### `POST /agents`

- 鉴权：Bearer Token
- 请求体：

```json
{
  "id": "agent-main",
  "name": "主 Agent",
  "enabled": true,
  "model": "claude-sonnet-4-5",
  "systemPromptMd": "# 你是一个严谨助手",
  "temperature": 0.2,
  "maxTokens": 4000,
  "skillIds": ["skill-a"],
  "mcpIds": ["mcp-a"]
}
```

- 响应：`{ "ok": true }`

### 4.4 Skill 管理

#### `GET /skills`

- 鉴权：Bearer Token
- 说明：返回已启用 Skill 列表（含 `skillMdContent`）

#### `POST /skills`

- 鉴权：Bearer Token
- 请求体：

```json
{
  "id": "skill-a",
  "name": "代码助手",
  "enabled": true,
  "skillMdContent": "# Skill\n..."
}
```

- 响应：`{ "ok": true }`

#### `PUT /skills/:skillId/content`

- 鉴权：Bearer Token
- 请求体：

```json
{
  "skillMdContent": "# Updated Skill\n..."
}
```

- 响应：`{ "ok": true }`

#### `POST /skills/sync`

- 鉴权：Bearer Token
- 说明：将文件缺失的 Skill 自动标记为 disabled
- 响应：`{ "ok": true }`

### 4.5 MCP 管理

#### `GET /mcps`

- 鉴权：Bearer Token
- 说明：返回已启用 MCP 列表

#### `POST /mcps`

- 鉴权：Bearer Token
- 请求体：

```json
{
  "id": "mcp-a",
  "name": "内部 HTTP MCP",
  "mode": "http",
  "enabled": true,
  "endpoint": "https://example.com/mcp",
  "command": null,
  "args": [],
  "env": {},
  "headers": {},
  "authConfig": {},
  "timeoutMs": 30000
}
```

- 响应：`{ "ok": true }`

### 4.6 运行接口（单入口自动会话）

#### `POST /runs/invoke`

- 鉴权：`X-API-Key` 或 Bearer Token
- 返回语义：异步受理，接口会立即返回 `runId` 与 `conversationId`
- 说明：
  - 不传 `conversationId`：自动创建新会话
  - 传 `conversationId` 且存在：继续该会话
  - 传 `conversationId` 但不存在：自动按该 ID 创建会话

- 请求体：

```json
{
  "agentId": "agent-main",
  "prompt": "请总结这段日志",
  "conversationId": "conv-001",
  "conversationTitle": "订单服务会话",
  "metadata": {
    "caller": "order-service",
    "requestId": "req-20260211-001"
  }
}
```

- 响应：

```json
{
  "ok": true,
  "runId": "run_xxx",
  "conversationId": "conv-001"
}
```

#### `GET /runs/:runId`

- 鉴权：`X-API-Key` 或 Bearer Token
- 事件写入语义：流式写入（Agent 运行期间每产生一条事件就立即落库并推送）
- 响应：

```json
{
  "ok": true,
  "run": {
    "id": "run_xxx",
    "source": "api",
    "agentId": "agent-main",
    "conversationId": "conv-001",
    "turnIndex": 1,
    "sdkSessionId": "...",
    "status": "completed",
    "inputJson": "{...}",
    "outputJson": "{...}",
    "errorMsg": null,
    "startedAt": 1739260000000,
    "endedAt": 1739260001200,
    "latencyMs": 1200,
    "costJson": "{...}"
  },
  "events": [
    {
      "id": 1,
      "runId": "run_xxx",
      "seq": 1,
      "eventType": "run.started",
      "payloadJson": "{...}",
      "createdAt": 1739260000000
    }
  ]
}
```

- `events` 中常见 `eventType`：
  - `run.started` / `run.completed` / `run.failed`
  - `agent.resolved` / `skill.runtime_prepared`
  - `agent.system.init` / `agent.system.status`
  - `agent.assistant` / `agent.result`
  - `agent.tool.call` / `agent.tool.progress` / `agent.tool.result` / `agent.tool.summary`
  - `agent.stream_event`（包含 SDK 原始流事件）

#### `GET /ws/runs/:runId`

- 鉴权：支持两种方式
  - `X-API-Key`（推荐）
  - `Authorization: Bearer <token>` 或 `?token=...`
- 服务调用也支持 `?apiKey=<RUN_INVOKE_API_KEY>`
- 推送消息：

```json
{
  "runId": "run_xxx",
  "seq": 2,
  "eventType": "agent.tool.call",
  "payload": {
    "toolUseId": "tool_001",
    "toolName": "Bash",
    "input": {
      "command": "pwd"
    },
    "parentToolUseId": null
  },
  "createdAt": 1739260000100
}
```

## 5. 常见错误

### 401 未授权

```json
{
  "ok": false,
  "message": "服务调用鉴权失败（X-API-Key 无效）"
}
```

### 404 run 不存在

```json
{
  "ok": false,
  "message": "run 不存在"
}
```

### 500 运行服务未配置 API Key

```json
{
  "ok": false,
  "message": "RUN_INVOKE_API_KEY 未配置"
}
```

## 6. 接入建议

- 外部服务持久化 `conversationId`，用于多轮复用。
- 每次调用 `POST /runs/invoke` 后持久化 `runId`。
- 先用 WebSocket 实时消费，再用 `GET /runs/:runId` 做落库兜底。
- 通过 `metadata` 透传业务字段（`caller`、`requestId`、主键等）。
- 推荐轮询策略：初始 500ms，随后逐步退避到 2s，直至 `status` 变为 `completed` 或 `failed`。
