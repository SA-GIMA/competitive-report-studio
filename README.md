# Competitive Report Studio (v4.0)

面向中文互联网场景的智能分析工作台，通过「模型路由 + 多源检索 + 结构化抽取 + 图表渲染 + Word 导出」的流水线，把自然语言需求直接转成可交付的分析产物。

当前包含三条可落地能力线：

- **智能竞品分析报告**：输入一句中文需求，自动完成竞品发现、画像抽取、图表生成与 Word 报告导出（支持联网搜索与材料上传双入口）。
- **智能功能清单生成**：输入产品描述，自动产出模块划分、功能项、字段定义与验收标准（v4.0 已从预留入口升级为完整能力）。
- **智能甘特图生成**：输入项目目标与工期，自动生成可编辑排期，支持正排/倒排与多种工作日规则。

---

## v4.0 更新说明

v4.0 在 v3.0 基础上补齐了第三条能力线，并对模型接入、任务链路、前端形态做了整体工程化收敛。

### 本次版本重点

- **智能功能清单完整落地**：新增 `FeatureListService` 全链路（生成 / 列表 / 详情 / 编辑 / 历史 / Markdown 导出），支持模块划分、功能项字段定义、验收标准、P0–P3 优先级与复杂度评估，不再只是预留入口。
- **模型接入增强**：支持从 OpenAI 兼容接口自动发现模型列表（`/api/models/discover`），模型健康检查、启停开关与「规划 / 抽取 / 写作」三路由统一管理。
- **任务链路工程化**：后台异步执行 + 进度轮询 + 暂停 / 恢复 / 重试 + 分阶段断点（checkpoint）+ 失败自动恢复（最多 3 次、退避重试），任务在服务重启后仍可从断点继续。
- **前端改版**：首页与竞品分析总览页重做，任务创建、功能清单、甘特图等页面交互升级，整体视觉与信息层级统一收敛。
- **本地持久化全覆盖**：模型、检索、模板、任务、报告、功能清单、甘特图、上传材料等状态均落入 `storage/`，重启不丢失。
- **报告下载友好化**：导出记录保存可读文件名，下载接口返回中文 Word 文件名。

---

## 核心能力全景

| 能力 | 说明 |
| --- | --- |
| 自然语言需求解析 | 自动解析行业、赛道、竞品类型、地域、时间范围、重点维度与报告目的，结构化回显供确认 |
| 双输入模式 | 联网搜索模式 + 材料上传模式（`.docx` / `.pptx` / `.txt` / `.md`，macOS 文本工具兜底） |
| 竞品发现与分层 | 自动发现候选竞品，支持直接 / 间接 / 替代分层；用户可确认竞品名单，检索失败时模型兜底补全 |
| 结构化画像抽取 | 统一抽取定位、用户、功能、价格、商业模式、渠道、优劣势与风险，每条结论带来源引用 |
| 图表生成 | 饼图 / 柱状图 / 折线图 / 四象限图 / 对比表，三种主题，支持用模型知识补全图表数据 |
| Word 报告导出 | 模板驱动章节结构，输出「可编辑版 + 最终版」两份 `.docx`，附录参考文献左对齐排版 |
| 智能功能清单 | 模块划分 → 功能项 → 字段定义 → 验收标准，支持 P0–P3 优先级、依赖关系与 Markdown 导出 |
| 智能甘特图 | 正排 / 倒排、双休 / 单休 / 自然日，自动排期、编辑保存、历史记录 |
| 任务生命周期 | 创建、排队、运行、暂停、恢复、重试、失败分类与自动恢复，实时进度与状态快照 |
| 模型中心 | 多供应商接入（OpenAI 兼容）、模型发现、健康检查、规划 / 抽取 / 写作分路由 |
| 检索中心 | `mock` / `search_api` / `searxng` / `serpapi_baidu` / `skill_bridge` / `hybrid` 六种模式，支持内置本地 SearXNG |
| 网络与访问 | API 监听地址与端口、CORS 来源、局域网访问开关，页面展示本机真实局域网 IP |

## 当前能力边界

- 内置 `SearXNG` 可本地安装并运行，但中国网络环境下不同引擎的稳定性仍取决于本机网络条件。
- 报告详情页以章节预览、图表、引用与产物下载为主，不是完整的富文本在线编辑器。
- 竞品分析任务为后台串行流水线，单任务按阶段推进，尚未支持多任务并行调度。

---

## 任务执行流水线

竞品分析任务按阶段推进，每完成一个阶段都会写入断点（checkpoint），支持暂停后从断点恢复：

```
需求解析 → 来源收集 → 候选准备 → 画像抽取 → 图表数据收集 → 图表生成 → 报告写作 → Word 导出
```

- **断点续跑**：任务执行中服务重启或失败后，可从最近 checkpoint 继续，避免重复消耗。
- **失败分类**：按 `configuration / input / temporary / provider / unknown` 分类；`temporary` 与 `provider` 类失败自动恢复（最多 3 次、退避等待）。
- **章节级记忆**：后续章节写作与审稿时会承接前文章节的标题、摘要与关键结论，减少重复定义与结论断层。
- **图表白名单**：仅「核心功能对比」章节允许注入图表，避免同一组图在多章节重复出现。

## 检索能力

- 六种检索模式：`mock`（内置模拟）、`search_api`（通用搜索接口）、`searxng`（内置/外部）、`serpapi_baidu`、`skill_bridge`（桥接服务）、`hybrid`（多路组合）。
- **内置 SearXNG 管理**：支持本地安装、启动、停止、状态检测、健康检查与真实检索测试；API 启动时可自动预热。
  - 默认 endpoint：`http://127.0.0.1:18080/search`
  - 默认引擎组合：`bing,baidu`，自动补全 `baidu`
  - 空结果自动回退到 `general,news` 查询，避免中国网络环境下单一引擎组合失效导致无结果
- 设置页将 SearXNG 操作拆为「检查当前状态」与「测试 SearXNG」两类，可分别验证实例运行与结果链路。

---

## 项目架构

npm workspaces Monorepo，TypeScript 全栈（Node 直跑 TS，无需预编译）：

| 模块 | 职责 |
| --- | --- |
| `apps/web-vue` | `Vite + Vue 3 + Composition API + Pinia + vue-router` 纯客户端 SPA（主入口） |
| `apps/api` | `Fastify 5` API 服务：任务调度、报告生命周期、模型 / 检索 / 模板 / 材料 / 功能清单 / 甘特图管理 |
| `apps/skill-bridge` | 检索桥接服务，将上游 Search API 以标准接口暴露给外部工具，支持降级结果 |
| `packages/orchestrator` | 竞品分析主编排：需求解析、查询构造、竞品发现、画像抽取、图表构造、章节写作与提示词 |
| `packages/retrieval` | 检索管道（聚合、去重、排序、清洗）+ 上传材料解析（docx/pptx/文本 → 结构化 block） |
| `packages/providers` | LLM 与搜索服务抽象：OpenAI 兼容模型、OpenSearch / Searxng / SerpApiBaidu / SkillBridge |
| `packages/charting` | 图表渲染：`sharp` 将 SVG 渲染为 PNG，支持五种图表类型 |
| `packages/docx-engine` | Word 生成：`docx` + `markdown-it`，模板占位符渲染，输出可编辑版与最终版 |
| `packages/config` | 配置管理：环境变量 + 持久化网络访问配置，CORS 默认值与局域网 IP 枚举 |
| `packages/shared` | 全仓共享类型定义（任务、报告、图表、甘特图、功能清单等） |

后端模块（`apps/api/src/modules`）：

| 模块 | 职责 |
| --- | --- |
| `pipeline` | 任务流水线编排，断点管理、暂停 / 恢复 / 重试、失败分类与自动恢复 |
| `tasks` | 任务生命周期与状态快照 |
| `models` | 模型接入、健康检查、模型发现、路由配置 |
| `materials` | 材料上传与元数据持久化 |
| `features` | 智能功能清单生成与管理 |
| `gantt` | 甘特图计划生成、排期计算、编辑与历史 |
| `templates` | Word 模板上传、章节配置、占位符绑定 |
| `reports` | 报告产物保存、快照与下载 |
| `retrieval` | 检索配置 + 内置 SearXNG 生命周期管理 |
| `system` | 网络访问配置与 CORS 来源判断 |

---

## 快速开始

```bash
npm install
npm run dev:api      # API 服务
npm run dev:web:vue  # Vue 前端
```

默认端口：

- API：`http://127.0.0.1:4100`
- Vue SPA：`http://127.0.0.1:3001`
- Skill Bridge：`http://127.0.0.1:4200`（可选，`npm run dev:bridge`）

仅使用新版前端时：

```bash
npm run dev:api
npm run dev:web:vue
```

内置 SearXNG 安装前提：本机具备 `git`、`python3`，可访问 `https://github.com/searxng/searxng.git` 与 Python 包安装源。首次在「设置 / 检索配置」中启动时，API 会自动安装并生成默认配置。

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `API_HOST` / `API_PORT` | API 监听地址与端口（非本机监听时建议设置 `API_TOKEN`） | `127.0.0.1` / `4100` |
| `API_TOKEN` | API 访问令牌（Bearer） | 未设置 |
| `WEB_BASE_URL` | 前端基础地址，参与 CORS 白名单 | `http://localhost:3000` |
| `CORS_ORIGINS` | 额外 CORS 来源（逗号分隔） | 默认含 localhost 3000/3001/5173 及局域网 IP |
| `REPORTS_DIR` / `CHARTS_DIR` / `TEMPLATES_DIR` / `MATERIALS_DIR` / `APP_STATE_DIR` | 各资源存储目录 | `./storage/*` |
| `SEARCH_API_ENDPOINT` / `SEARCH_API_KEY` | 通用搜索接口 | 未设置 |
| `SEARXNG_MODE` / `SEARXNG_ENDPOINT` / `SEARXNG_KEY` / `SEARXNG_PORT` / `SEARXNG_ENGINES` / `SEARXNG_AUTOCOMPLETE` / `SEARXNG_AUTO_START` | 内置 / 外部 SearXNG 配置 | 内置模式 |
| `SERPAPI_KEY` | SerpAPI（百度）检索密钥 | 未设置 |
| `SKILL_BRIDGE_ENDPOINT` / `SKILL_BRIDGE_KEY` | 桥接检索服务 | 未设置 |

## 资源目录

- 报告输出：`./storage/reports`
- 图表资源：`./storage/charts`
- 上传材料：`./storage/materials`
- 应用状态：`./storage/app-state`（模型、检索、模板、任务、功能清单、甘特图、网络访问等）
- 模板库：`./storage/templates`
- 内置 SearXNG：`./storage/app-state/embedded-searxng`

## 文档

- [架构深度解析](./docs/architecture.zh-CN.md)
- [用户操作手册](./docs/user-manual.zh-CN.md)
- [版本更新记录](./CHANGELOG.md)

推荐阅读顺序：用户操作手册 → 架构深度解析 → 版本更新记录。

## 版本标签

- `v4.0`：当前版本，功能清单全链路落地、模型发现、任务断点与自动恢复、前端改版、本地持久化全覆盖。
- `v3.0`：Vue 前端、局域网访问配置、内置 SearXNG、甘特图、本地持久化与报告写作优化。
- `v2.1`：章节级记忆、图表去重注入与附录排版优化。
- `v2.0`：模块化重构、文档上传与增强流水线。
- `v1.0`：最早的基础版本标签。
