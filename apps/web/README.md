# Web 模块说明

## 模块用途

`apps/web` 是前端控制台模块，后续用于：

- 单用户登录与会话管理
- Web 输入发起 Agent 运行
- 实时展示 Run 事件日志与执行结果
- 管理 Agent、Skill、MCP 配置

## 当前状态

- 已使用 `Vite + Vue 3 + TypeScript` 初始化
- 已完成单用户登录页（账号密码登录）
- 登录成功后会将 `token/expiresAt/username` 持久化到 `localStorage`
- 支持登录态展示与退出登录
- 已实现登录后的全局布局骨架（侧边导航 + 顶部信息区 + 内容占位区）
- 布局视觉已重构为高信息密度控制台风格，降低空白占比并优化层级
- 已修复侧栏导航项高度拉伸问题，导航密度与可读性提升
- 已压缩顶部用户信息面板，减少首屏视觉占用
- 顶部用户区改为点击展开详情面板（用户、过期时间、退出登录）
- 已预留主导航入口：运行控制台、运行详情、Agent 管理、Skill 管理、MCP 管理
- 已按组件化重构页面结构：`App.vue` 负责状态编排，布局与 Agent 页拆分为独立组件
- 已完成 Agent 管理界面首版：
  - 左侧窄导航展示全量 Agent（含启用与禁用）
  - 点击左侧 Agent 自动加载右侧编辑表单（无需手动“载入表单”）
  - Agent 列表读取（`GET /agents`）与详情读取（`GET /agents/:agentId`）
  - Agent 新建/覆盖保存（`POST /agents`）
  - Skill / MCP 绑定改为“可搜索 + 可滚动 + 批量选择 + 已选标签”模式，适配大规模配置
  - Skill / MCP 选择区域桌面端已改为横向双栏，减少纵向占用

## 环境变量

- 统一放在根目录 `env/web`：
  - `env/web/.env.development`
  - `env/web/.env.production`
- 可从 `env/web/.env.*.example` 复制后修改
- `VITE_API_BASE_URL`：登录 API 基地址，默认 `/api`
- `VITE_API_PROXY_TARGET`：仅开发模式下使用的 Vite 代理目标

## 常用命令

- 开发：`npm run dev -w @neodify/web`
- 类型检查：`npm run lint -w @neodify/web`
- 测试：`npm run test -w @neodify/web`
