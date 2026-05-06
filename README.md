# Competitive Report Studio (v3.0)

面向中文互联网场景的智能分析工作台，当前包含两条可落地能力线：

- 智能竞品分析报告生成
- 智能甘特图生成

其中竞品分析链路已支持检索、结构化抽取、图表生成与 Word 导出；检索层现已支持内置本地 `SearXNG`。

## v3.0 更新说明

v3.0 在 v2.1 的报告生成能力基础上，完成了前端形态、检索能力、本地持久化、网络访问和项目管理能力的进一步工程化。

### 本次版本重点

- 前端切换为 `Vite + Vue 3` 单页应用，当前主入口为 `apps/web-vue`。
- 设置页重组为“模型接入设置、模型路由设置、网络与访问、检索配置”四个分区。
- 新增网络与访问配置：支持 API 监听地址、CORS 来源、前端局域网访问开关，并在页面展示当前本机真实局域网 IP 地址。
- 新增智能甘特图能力：支持正排/倒排、工作日规则、历史记录和编辑保存。
- 内置本地 `SearXNG` 管理：支持安装、启动、停止、状态检测与真实检索测试。
- 完成本地持久化补强：模型配置、检索配置、模板配置、任务数据、报告记录、上传材料元数据以及生成的报告/图表文件都会保存在本地目录，服务重启后不会因为仅存于内存而丢失。
- 新增章节级上下文记忆：后续章节会读取前面章节的标题、摘要、关键结论与已用图表信息，减少重复定义和结论断层。
- 优化图表注入规则：只有“核心功能对比”章节允许保留图表，避免同一组六张图在多个章节中反复出现。
- 优化 Word 附录排版：“附录：参考资料”改为左对齐、无首行缩进，更符合参考文献阅读习惯。
- 补强写作与审稿提示词：模型在写当前章节时会显式承接前文，审稿阶段也会检查与前文章节的一致性。

## 当前核心能力

- 支持中文竞品分析任务创建、运行、暂停、恢复与重试。
- 支持搜索模式与文档上传模式两种分析入口。
- 支持图表生成、Word 报告导出与任务状态快照。
- 支持内置本地 SearXNG 管理，可直接由 API 自动安装并启动本机检索实例。
- 支持甘特图自动生成、历史记录与编辑保存。
- 支持 Fastify 5 后端、TypeScript Monorepo 架构，以及 Vue 前端实现。

## 当前能力边界

- `SearXNG` 已可作为内置检索实例运行，但中国网络环境下不同引擎的稳定性仍取决于本机网络条件。
- “智能功能清单生成”仍是预留入口，尚未接入完整后端流程。
- 报告详情页仍以任务详情和产物下载为主，不是完整的富预览编辑器。

## 项目架构

- `apps/web-vue`
  基于 `Vite + Vue 3 + Composition API + TypeScript` 的纯客户端单页应用（SPA）。
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

`dev:web` 默认启动 Vue SPA。也可以使用显式脚本：

```bash
npm install
npm run dev:api
npm run dev:web:vue
```

默认端口说明：

- API：`http://127.0.0.1:4100`
- Vue SPA：默认运行在 `http://127.0.0.1:3001`

如果你只想使用新版前端，可以只启动：

```bash
npm run dev:api
npm run dev:web:vue
```

如果要使用内置 SearXNG，请确保本机可用：

- `git`
- `python3`
- 能访问 `https://github.com/searxng/searxng.git`
- 能访问 Python 包安装源

首次在“设置 / 检索配置”里启动内置 SearXNG 时，API 会自动在本地安装并生成默认配置。

默认行为：

- endpoint：`http://127.0.0.1:18080/search`
- 默认引擎组合：`bing,baidu`
- 默认自动补全：`baidu`
- 默认策略：优先按你配置的 `engines` 查询；若该组合返回空结果，会自动回退到普通 `general,news` 查询，避免在中国网络环境下因单一引擎组合失效而完全无结果

设置页中与 SearXNG 相关的操作已经分成两类：

- `检查当前 SearXNG 状态`：检查当前实例是否正常运行
- `测试 SearXNG`：发起一次真实检索，确认结果链路是否可用

如需桥接检索服务：

```bash
npm run dev:bridge
```

## 资源目录

- 报告输出：`./storage/reports`
- 图表资源：`./storage/charts`
- 应用状态：`./storage/app-state`
- 模板库：`./storage/templates`
- 内置 SearXNG：`./storage/app-state/embedded-searxng`

## 推荐阅读顺序

- [用户操作手册](./docs/user-manual.zh-CN.md)
- [架构深度解析](./docs/architecture.zh-CN.md)
- [版本更新记录](./CHANGELOG.md)

## 版本标签

- `v3.0`：当前版本，包含 Vue 前端、局域网访问配置、内置 SearXNG、甘特图、本地持久化与报告写作优化。
- `v2.1`：包含章节级记忆、图表去重注入与附录排版优化。
- `v2.0`：保留的上一版本标签，便于回溯历史状态。
- `v1.0`：最早的基础版本标签。
