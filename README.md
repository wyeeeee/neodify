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
