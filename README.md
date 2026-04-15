# Competitive Report Studio (v2.1)

面向中文互联网场景的自动竞品分析报告系统，支持检索、结构化抽取、图表生成与 Word 导出。

## v2.1 更新说明

v2.1 在 v2.0 的工业化基础上，继续把“报告可读性”和“章节写作连贯性”往前推进，重点解决生成报告时常见的重复、割裂与版式细节问题。

### 本次版本重点

- 新增章节级上下文记忆：后续章节会读取前面章节的标题、摘要、关键结论与已用图表信息，减少重复定义和结论断层。
- 优化图表注入规则：只有“核心功能对比”章节允许保留图表，避免同一组六张图在多个章节中反复出现。
- 优化 Word 附录排版：“附录：参考资料”改为左对齐、无首行缩进，更符合参考文献阅读习惯。
- 补强写作与审稿提示词：模型在写当前章节时会显式承接前文，审稿阶段也会检查与前文章节的一致性。

## v2.0 基础能力

- 支持中文竞品分析任务创建、运行、暂停、恢复与重试。
- 支持搜索模式与文档上传模式两种分析入口。
- 支持图表生成、Word 报告导出与任务状态快照。
- 支持 Fastify 5 后端、Next.js 15 前端与 TypeScript Monorepo 架构。

## 项目架构

- `apps/web`
  Web 管理台与任务操作界面。
- `apps/api`
  API 服务、任务调度、报告生命周期管理。
- `apps/skill-bridge`
  检索桥接与降级能力。
- `packages/orchestrator`
  竞品分析主编排逻辑。
- `packages/retrieval`
  检索与文档材料处理。
- `packages/providers`
  模型与搜索服务抽象。
- `packages/charting`
  图表渲染。
- `packages/docx-engine`
  Word 生成与版式处理。
- `packages/config`
  配置管理。
- `packages/shared`
  共享类型定义。

## 文档

- [架构深度解析](./docs/architecture.zh-CN.md)
- [用户操作手册](./docs/user-manual.zh-CN.md)
- [版本更新记录](./CHANGELOG.md)

## 本地开发

```bash
npm install
npm run dev:api
npm run dev:web
```

如需桥接检索服务：

```bash
npm run dev:bridge
```

## 资源目录

- 报告输出：`./storage/reports`
- 图表资源：`./storage/charts`
- 应用状态：`./storage/app-state`
- 模板库：`./storage/templates`

## 版本标签

- `v2.1`：当前版本，包含章节级记忆、图表去重注入与附录排版优化。
- `v2.0`：保留的上一版本标签，便于回溯历史状态。
- `v1.0`：最早的基础版本标签。
