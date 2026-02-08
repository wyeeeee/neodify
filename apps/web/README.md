# Web 模块说明

## 模块用途

`apps/web` 是前端控制台模块，后续用于：

- 单用户登录与会话管理
- Web 输入发起 Agent 运行
- 实时展示 Run 事件日志与执行结果
- 管理 Agent、Skill、MCP、Schedule 配置

## 当前状态

- 已使用 `Vite + Vue 3 + TypeScript` 初始化
- 当前为基础脚手架页面，业务 UI 待按后端能力逐步接入

## 常用命令

- 开发：`npm run dev -w @neodify/web`
- 类型检查：`npm run lint -w @neodify/web`
- 测试：`npm run test -w @neodify/web`
