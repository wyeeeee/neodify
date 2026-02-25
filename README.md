# Neodify

## 项目简介

Neodify 是一个基于 `Claude Agent SDK` 的生产级 Agent 运行框架（规划中）。
当前阶段聚焦：

- 单输入模式：`服务接口输入（API Invoke）`
- 前后端技术栈：`TypeScript + Vue 3`
- 可实时查看运行执行记录
- 多 Agent 独立配置（每个 Agent 的 Skill/MCP 单独绑定）
- Skill 严格遵循 Anthropic Skill 规范（`skills/<skill_name>/SKILL.md`）
- Skill 支持在线新建、编辑、预览（无版本控制）
- 提供 Agent 提示词在线编写（Markdown 渲染与代码高亮）
- MCP 支持在线配置多模式：`http`、`sse`、`uvx`、`npx`
- 数据库访问已内聚到 `apps/server/src/db`（SQLite）
- 数据库切换采用破坏式重建，不做迁移脚本与兼容层
- 当前阶段不做版本控制与 MCP 权限管理

## 当前文件说明

- `PLAN.md`：V1 详细设计计划，包含标准 Skill 格式、架构、数据模型、模块划分、里程碑与验收标准。
- `apps/server/src/db`：后端内置数据库层（schema + repository + type）。
- `docs/api-spec.md`：后端接口规范，已补充运行事件类型与 tool 调用链路事件说明。

## 最近后端更新（2026-02-11）

- `POST /runs/invoke` 采用异步受理语义，先返回 `runId/conversationId`，结果通过查询或事件流获取。
- 运行事件已增强，`run_events` 可保留工具调用链路（`agent.tool.call/progress/result/summary`）。
- 后端开发模式日志启用美化输出（`pino-pretty`），便于本地调试与排障。
- Skill 配置支持自动对齐本地文件：`skills/*/SKILL.md` 新增自动入库启用、缺失自动禁用（默认每 3 秒同步一次）。
- Agent 管理接口已增强：`GET /agents` 返回全量（含启用/禁用），并新增 `GET /agents/:agentId` 返回详情（含 `skillIds/mcpIds`）。

## 最近前端更新（2026-02-25）

- 登录成功后已切换为统一全局布局（TopBar + Sidebar + 内容区）。
- 全局布局已重构为高信息密度风格（紧凑侧栏、规范顶栏、轻量占位区）。
- 已修复侧栏导航项异常拉伸问题，导航卡片改为紧凑固定高度。
- 顶栏用户信息区已压缩为单行紧凑样式，减少首屏占用。
- 顶栏用户信息改为点击展开下拉面板，展示详细信息与退出按钮。
- 前端已按组件化重构（壳层布局、Agent 页面、占位页拆分为独立组件）。
- Agent 管理页已从占位改为可用界面：左侧窄导航展示全量 Agent，点击即自动载入右侧编辑器。
- Skill / MCP 绑定区支持大规模场景：可搜索、可滚动、批量勾选、已选标签，并已调整为横向双栏布局。
- Agent 列表项已加入可扩展操作菜单，当前提供“删除 Agent”能力。
- 删除交互已改为自定义二次确认菜单，避免浏览器系统弹窗。
- Agent 编辑表单已改为紧凑网格排版，状态切换改为自定义启用/禁用按钮组。
- 全局 UI 已统一响应式适配：桌面高密度布局、移动端导航横向滚动与单列表单。
- 已预留控制台、运行详情、Agent、Skill、MCP 五个主导航入口。
- 各导航页当前为占位内容，便于后续按模块逐步实现业务界面。

## 启动命令

- 一键开发启动（前后端同时）：`npm run dev`
- 一键构建：`npm run build`
- 构建后一键启动（server + web preview）：`npm run start`

## 环境变量目录（开发/生产分离）

- `env/server/.env.development`、`env/server/.env.production`
- `env/web/.env.development`、`env/web/.env.production`
- 示例文件见 `env/**/*.env.example`，复制为对应 `.env` 后使用

说明：

- 前后端环境变量分开维护，但目录统一在根目录 `env/`
- 开发模式：Web 使用 Vite 代理（`VITE_API_PROXY_TARGET`）
- 生产模式：推荐 Nginx 反代 `/api`，Web 保持 `VITE_API_BASE_URL=/api`

## 下一步实施顺序

1. 完成单用户登录与前端登录流程联动
2. 打通服务接口调用到运行事件实时展示闭环
3. 完成多 Agent、Skill（SKILL.md）管理、Prompt Studio 与 MCP 在线配置能力
4. 完成前端高信息密度控制台与配置管理页面
