# Competitive Report Studio

面向中文互联网场景的自动竞品分析报告系统骨架。

## 目标

- 用户只输入一句自然语言需求，系统自动完成需求解析、检索、抽取、分析、图表生成和 Word 报告导出。
- 支持多模型供应商、多 Word 模板、多图表主题和可追溯生成记录。
- 架构优先考虑后续扩展和接近真实产品的工程组织方式。
- 图表生成前会补一轮图表专用检索，并沿用当前任务选择的检索模式。

## 当前骨架包含

- `apps/web`
  - 任务创建页、模板管理页、模型设置页、报告预览页
- `apps/api`
  - 模型管理、模板管理、任务管理、报告管理、分析流水线
- `packages/providers`
  - OpenAI 兼容模型接入抽象、检索 Provider 抽象
- `packages/retrieval`
  - 中文检索结果聚合、清洗、去重、排序
- `packages/orchestrator`
  - 竞品分析主流水线编排
- `packages/charting`
  - 图表资源渲染接口与 PNG 信息图实现
- `packages/docx-engine`
  - Word 模板占位符引擎与导出接口骨架
- `packages/shared`
  - 核心数据结构定义

## 核心文档

- [架构方案](./docs/architecture.zh-CN.md)
- [使用说明书](./docs/user-manual.zh-CN.md)

## 本地开发

```bash
npm install
npm run dev:api
npm run dev:web
```

可选启动 Skill Bridge 示例服务：

```bash
npm run dev:bridge
```

当前仓库默认提供 `demo` provider，方便先联调页面和流水线。接入真实模型或真实中文检索服务时，只需要替换对应 provider 和环境变量。
当前图表不会只依赖结构化抽取结果，而是会在生成前追加一轮图表专用检索。

## 运行入口

- API: `http://localhost:4100/api/health`
- Web: `http://localhost:3000`
- Skill Bridge Demo: `http://localhost:4200/health`
- 报告输出目录: `./storage/reports`
- 图表输出目录: `./storage/charts`

## 体验方式

1. 启动 API 服务
2. 启动 Web 服务
3. 访问任务页，先按页面原型体验配置和流程
4. 通过 `POST /api/tasks` 创建任务，再调用 `POST /api/tasks/:id/run` 触发完整 demo 流水线
