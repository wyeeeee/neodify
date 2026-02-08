# Web 模块说明

## 模块用途

`apps/web` 是前端控制台模块，后续用于：

- 单用户登录与会话管理
- Web 输入发起 Agent 运行
- 实时展示 Run 事件日志与执行结果
- 管理 Agent、Skill、MCP、Schedule 配置

## 当前状态

- 已使用 `Vite + Vue 3 + TypeScript` 初始化
- 已完成单用户登录页（账号密码登录）
- 登录成功后会将 `token/expiresAt/username` 持久化到 `localStorage`
- 支持登录态展示与退出登录

## 环境变量

- `VITE_API_BASE_URL`：后端 API 基地址，默认 `http://127.0.0.1:3000`

## 常用命令

- 开发：`npm run dev -w @neodify/web`
- 类型检查：`npm run lint -w @neodify/web`
- 测试：`npm run test -w @neodify/web`
