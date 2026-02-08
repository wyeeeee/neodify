# Neodify

## 项目简介

Neodify 是一个基于 `Claude Agent SDK` 的生产级 Agent 调度框架（规划中）。
当前阶段聚焦：

- 双输入模式：`Web 输入` 与 `定时任务输入（Cron）`
- 前后端技术栈：`TypeScript + Vue 3`
- 可实时查看运行执行记录
- 多 Agent 独立配置（每个 Agent 的 Skill/MCP 单独绑定）
- Skill 严格遵循 Anthropic Skill 规范（`skills/<skill_name>/SKILL.md`）
- Skill 支持在线新建、编辑、预览（无版本控制）
- 提供 Agent 提示词在线编写（Markdown 渲染与代码高亮）
- MCP 支持在线配置多模式：`http`、`sse`、`uvx`、`npx`
- 统一 ORM 使用 Drizzle，当前仅使用 SQLite
- 数据库切换采用破坏式重建，不做迁移脚本与兼容层
- 当前阶段不做版本控制与 MCP 权限管理

## 当前文件说明

- `PLAN.md`：V1 详细设计计划，包含标准 Skill 格式、架构、数据模型、模块划分、里程碑与验收标准。

## 下一步实施顺序

1. 初始化 Monorepo 结构（`apps/web`, `apps/server`, `packages/db`）
2. 使用 Drizzle ORM 建立 SQLite schema 与 migration
3. 打通 Web 输入到运行事件实时展示闭环
4. 完成 Cron 输入、多 Agent、Skill（SKILL.md）管理、Prompt Studio 与 MCP 在线配置能力
