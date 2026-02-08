# DB 模块说明

## 模块用途

`packages/db` 是数据库访问模块，负责：

- 统一定义 SQLite 下的数据表结构
- 提供类型安全的数据库访问接口
- 封装基础仓储能力，供 server 模块调用

## 目录约定

- `src/schema/*`：表结构定义
- `src/client/*`：数据库连接与初始化
- `src/repositories/*`：数据访问仓储
- `test/*`：数据库模块测试

## 当前已实现

- SQLite 连接初始化与数据目录自动创建
- V1 核心表自动建表：agents/skills/mcps/schedules/runs/run_events
- 仓储能力：Agent/Skill/MCP/Schedule/Run/RunEvent
- DB 模块单元测试：验证写入、查询与运行事件时间线
