# Competitive Report Studio (v2.0)

面向中文互联网场景的**工业级**自动竞品分析报告系统。

## 🚀 v2.0 重大更新说明

本次版本 (v2.0) 在 v1.0 骨架的基础上进行了全方位的工业化重构，旨在提供更稳定、更专业、更具生产环境能力的竞品分析体验。

### 核心功能升级
- **【新增】多模态情报接入 (Document Upload)**：除了互联网实时搜索，现在支持上传企业内部 PDF/Word 文档。系统可深度解析私有材料，实现“搜索+本地文档”的双轮驱动分析。
- **【重构】工业级 API 架构**：后端全面迁移至 **Fastify 5**，引入模块化服务层 (`ModelService`, `TaskService`, `ReportService` 等)，支持任务的暂停、恢复与失败重试。
- **【升级】现代化前端体验**：Web 端升级至 **Next.js 15** 与 **React 19**，提供更流畅的任务监控仪表盘与更丰富的可视化交互。
- **【增强】智能分析管线 (Orchestrator)**：
  - **知识补全**：新增 LLM 驱动的图表数据自动补全，解决网络信息残缺导致的图表空白。
  - **状态快照**：完整记录分析过程中的中间状态（搜索原始文档、Profile 快照等），确保分析结果可追溯、可审计。
  - **鲁棒性优化**：集成了 JSON 修复算法，大幅提升了大模型输出不稳定时的系统容错率。
- **【扩展】多样化检索源**：新增对 **Searxng**、**SerpAPI (Baidu)** 的支持，并深度优化了针对中文互联网环境的情报清洗与去重算法。

---

## 🏗️ 项目架构

项目采用高性能 TypeScript Monorepo 组织：

- `apps/web` (Next.js 15): 任务可视化监控、模型/模板配置中心。
- `apps/api` (Fastify 5): 核心业务逻辑、任务调度、报告生命周期管理。
- `apps/skill-bridge`: 检索代理与降级 Mock 服务。
- `packages/orchestrator`: 竞品分析核心管线逻辑。
- `packages/retrieval`: 检索结果聚合、清洗、去重、排序及文档解析。
- `packages/providers`: 模型供应商 (OpenAI 兼容) 与检索服务抽象。
- `packages/charting`: 专业图表渲染引擎（支持象限图、对比表、趋势图）。
- `packages/docx-engine`: 工业级 Word 模板引擎，支持 Markdown 解析与样式自动化。
- `packages/config`: 集中式全环境配置管理。
- `packages/shared`: 核心业务模型与数据结构定义。

## 📜 文档指南
- [架构深度解析](./docs/architecture.zh-CN.md)
- [用户操作手册](./docs/user-manual.zh-CN.md)

## 🛠️ 本地开发

```bash
# 安装依赖 (推荐 npm 10.9.2+)
npm install

# 启动 API 服务
npm run dev:api

# 启动 Web 服务
npm run dev:web

# (可选) 启动检索桥接服务
npm run dev:bridge
```

## 📊 资源目录
- 报告输出: `./storage/reports`
- 图表资源: `./storage/charts`
- 应用状态: `./storage/app-state`
- 模板库: `./storage/templates`

---
*注：v1.0 版本的历史代码已通过 Git Tag `v1.0` 永久保留，您可以在 GitHub 的 Releases/Tags 页面随时切换查看。*
