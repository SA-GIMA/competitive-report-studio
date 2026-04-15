# Competitive Report Studio 使用说明书（v2.1）

## 1. 文档目的

本文档是 `Competitive Report Studio` 的完整使用说明书，面向以下角色：

- 产品经理
- 业务分析师
- 战略研究人员
- 项目实施与交付人员
- 负责本地部署和二次开发的工程人员

本文重点说明：

- 如何在本机启动系统
- 如何使用模型设置、模板管理、任务创建和报告生成功能
- 如何理解系统当前能力边界
- 如何排查常见问题
- 如何继续扩展为更完整的生产系统

## 2. 系统概述

`Competitive Report Studio` 是一个面向中文互联网场景的自动竞品分析报告系统。

它的目标是让用户只输入一句自然语言需求，例如：

- “帮我分析国内 AI 办公助手赛道的主要竞品”
- “做一份面向老板汇报的生鲜电商竞品分析报告”
- “分析面向中小企业的低代码平台竞品”

系统随后自动完成以下流程：

1. 解析需求
2. 规划检索 query
3. 发现候选竞品
4. 抽取结构化信息
5. 补充图表专用检索
6. 生成图表资源
7. 生成报告正文
8. 导出 Word 报告

## 3. 当前版本包含的主要能力

### 3.0 v2.1 本次更新

- 报告章节生成新增“前文章节记忆”，后续章节会参考前面章节的摘要与关键结论继续写作。
- 图表插入逻辑已收紧，默认只在“核心功能对比”章节展示图表，避免整份报告多章节重复插图。
- Word 导出的“附录：参考资料”改为左对齐、无首行缩进，附录阅读体验更稳定。

### 3.1 已可用能力

- 本地启动 Web 和 API 服务
- 模型列表读取、编辑、保存、健康检查、任务路由切换
- 模板列表查看、上传 `.docx`、章节编辑、启停、排序、保存
- 任务页进行需求解析预览
- 任务页直接创建并运行报告生成任务
- 任务页显示后台执行进度
- 生成真实 `.docx` 文件
- 输出图表资源文件
- 使用浏览器页面体验主要流程

### 3.2 当前仍为示例能力

- 中文互联网检索目前为 mock 数据源
- 报告内容生成主要依赖 demo provider
- 模板上传后尚未自动解析真实 Word 占位符
- 数据存储目前以内存为主，重启服务后动态配置不会保留
- 报告详情页尚未完全接入真实数据预览

## 4. 目录说明

项目根目录：

- [competitive-report-studio](/Users/sagima/competitive-report-studio)

关键目录说明：

- [apps/web](/Users/sagima/competitive-report-studio/apps/web)
  - 前端界面
- [apps/api](/Users/sagima/competitive-report-studio/apps/api)
  - 后端 API
- [packages/shared](/Users/sagima/competitive-report-studio/packages/shared)
  - 共享类型定义
- [packages/orchestrator](/Users/sagima/competitive-report-studio/packages/orchestrator)
  - 报告流水线编排
- [packages/docx-engine](/Users/sagima/competitive-report-studio/packages/docx-engine)
  - Word 生成逻辑
- [packages/charting](/Users/sagima/competitive-report-studio/packages/charting)
  - 图表输出逻辑
- [docs/architecture.zh-CN.md](/Users/sagima/competitive-report-studio/docs/architecture.zh-CN.md)
  - 架构说明
- [docs/user-manual.zh-CN.md](/Users/sagima/competitive-report-studio/docs/user-manual.zh-CN.md)
  - 本文档

## 5. 环境要求

建议环境：

- macOS / Linux
- Node.js `23.x`
- npm `10.x`

当前项目已经适配：

- `npm workspaces`
- Node 原生 `--experimental-strip-types`

不要求本机安装 `pnpm`。

## 6. 安装与启动

### 6.1 安装依赖

在项目根目录执行：

```bash
cd /Users/sagima/competitive-report-studio
npm install
```

### 6.2 启动 API

```bash
cd /Users/sagima/competitive-report-studio
npm run dev:api
```

默认监听地址：

- `http://127.0.0.1:4100`

健康检查接口：

- `http://127.0.0.1:4100/api/health`

### 6.3 启动 Web

另开一个终端：

```bash
cd /Users/sagima/competitive-report-studio
npm run dev:web
```

默认访问地址：

- `http://127.0.0.1:3000`

### 6.4 启动 Skill Bridge 示例服务

如果你希望测试 `Skill Bridge` 检索模式，可额外启动示例 bridge：

```bash
cd /Users/sagima/competitive-report-studio
npm run dev:bridge
```

默认地址：

- `http://127.0.0.1:4200/health`

### 6.5 产物输出目录

生成的文件默认输出到：

- 报告目录
  - [storage/reports](/Users/sagima/competitive-report-studio/storage/reports)
- 图表目录
  - [storage/charts](/Users/sagima/competitive-report-studio/storage/charts)
- 模板目录
  - [storage/templates](/Users/sagima/competitive-report-studio/storage/templates)

## 7. 页面使用说明

### 7.1 总览页

地址：

- [/](/Users/sagima/competitive-report-studio/apps/web/src/app/page.tsx)

作用：

- 查看系统定位
- 快速进入任务创建、模板管理、模型设置

当前特点：

- 用于展示产品入口和关键能力
- 不承担具体业务操作

### 7.2 模型设置页

地址：

- [settings/page.tsx](/Users/sagima/competitive-report-studio/apps/web/src/app/settings/page.tsx)

核心组件：

- [settings-console.tsx](/Users/sagima/competitive-report-studio/apps/web/src/components/settings-console.tsx)

#### 页面功能

- 查看已有模型列表
- 编辑模型信息
- 新建模型连接
- 删除模型连接
- 套用主流模型预设
- 保存模型配置
- 检测模型可用性
- 设置规划模型、抽取模型、写作模型路由
- 配置 Search API
- 配置 Skill Bridge

#### 可编辑字段

- `label`
- `id`
- `provider`
- `baseUrl`
- `apiKeyRef`
- `model`
- `timeoutMs`
- `temperature`
- `maxTokens`
- `enabled`

#### 典型使用流程

1. 进入“模型设置”
2. 在左侧选择已有模型，或点击“新建模型”
3. 如果是常见模型，可以先点击主流模型预设自动带入 Base URL 和 Model
4. 在右侧填写或微调模型连接信息
5. 点击“检测可用性”
6. 点击“保存模型”
6. 在下方“任务路由”区域设置：
   - 规划模型
   - 抽取模型
   - 写作模型
7. 在“检索配置”区域设置：
   - `Search API Endpoint`
   - `Search API Key`
   - `Skill Bridge Endpoint`
   - `Skill Bridge Key`

#### 当前注意事项

- 目前模型配置保存在内存中
- API 重启后，手工新增和修改的模型不会保留
- 若要长期保存，需要后续接数据库

### 7.3 模板管理页

地址：

- [templates/page.tsx](/Users/sagima/competitive-report-studio/apps/web/src/app/templates/page.tsx)

核心组件：

- [template-console.tsx](/Users/sagima/competitive-report-studio/apps/web/src/components/template-console.tsx)

#### 页面功能

- 查看模板列表
- 上传 `.docx` 模板
- 编辑模板名称、风格、描述
- 编辑章节结构
- 新增章节
- 删除章节
- 上移/下移章节
- 启停章节
- 保存模板配置

#### 模板上传流程

1. 进入“模板管理”
2. 在“上传模板”区域选择一个 `.docx` 文件
3. 输入模板名称
4. 选择模板风格：
   - `executive`
   - `research`
   - `brief`
5. 输入模板描述
6. 点击“上传并创建模板”

#### 章节配置流程

1. 在左侧模板列表中选中一个模板
2. 在下方“模板章节配置”中逐项编辑
3. 可操作项包括：
   - 修改章节标题
   - 修改章节描述
   - 修改占位符 key
   - 启停章节
   - 上移/下移
   - 删除章节
4. 点击“保存模板配置”

#### 当前注意事项

- 当前上传逻辑会保存文件并生成模板记录
- 但还没有自动解析 Word 内部真实占位符
- 当前属于“模板文件管理 + 章节配置管理”阶段

### 7.4 创建任务页

地址：

- [tasks/new/page.tsx](/Users/sagima/competitive-report-studio/apps/web/src/app/tasks/new/page.tsx)

核心组件：

- [task-console.tsx](/Users/sagima/competitive-report-studio/apps/web/src/components/task-console.tsx)

#### 页面功能

- 输入自然语言需求
- 选择报告模板
- 设置候选竞品数量上限
- 选择检索模式
- 执行需求解析预览
- 创建并运行分析任务
- 查看解析结果
- 查看候选竞品
- 查看最终生成的报告路径

#### 使用步骤

1. 输入自然语言需求
2. 选择模板
3. 设置 `Top N`
4. 选择检索模式：
   - `Mock`
   - `Search API`
   - `Skill Bridge`
   - `Hybrid`
5. 点击“解析需求”
6. 查看右侧结构化解析结果
7. 查看候选竞品
8. 点击“创建并运行”
9. 等待任务结束
10. 在“执行结果”区域查看 Word 文件路径

当前创建任务页中：

- “报告版本”用于决定最终报告的章节结构与写作风格
- “竞品数量上限”用于决定最终纳入分析的竞品数量

#### 当前注意事项

- 当前候选竞品仍是自动发现结果
- 还不支持页面内勾选确认、手动增删候选竞品
- 这部分适合后续继续补强

### 7.5 报告预览页

地址：

- [reports/[id]/page.tsx](/Users/sagima/competitive-report-studio/apps/web/src/app/reports/[id]/page.tsx)

当前状态：

- 仍偏向展示型页面
- 尚未完全接入真实报告内容数据

未来建议：

- 按报告 ID 拉取章节内容
- 展示图表
- 展示引用来源
- 展示生成记录
- 支持局部刷新

## 8. API 使用说明

### 8.1 健康检查

```http
GET /api/health
```

返回示例：

```json
{ "ok": true }
```

### 8.2 获取模型列表

```http
GET /api/models
```

返回内容包括：

- `items`
- `routing`

### 8.3 保存新模型

```http
POST /api/models
```

请求体示例：

```json
{
  "id": "custom-gpt",
  "provider": "openai-compatible",
  "label": "自定义 GPT",
  "baseUrl": "https://api.openai.com/v1",
  "apiKeyRef": "${OPENAI_API_KEY}",
  "model": "gpt-4.1-mini",
  "timeoutMs": 30000,
  "temperature": 0.4,
  "maxTokens": 2400,
  "enabled": true
}
```

### 8.4 更新模型

```http
PUT /api/models/:id
```

### 8.5 检测模型可用性

```http
GET /api/models/:id/check
```

### 8.6 更新模型路由

```http
POST /api/models/routing
```

请求体示例：

```json
{
  "plannerModelId": "demo-planner",
  "extractorModelId": "demo-extractor",
  "writerModelId": "demo-writer"
}
```

### 8.7 获取模板列表

```http
GET /api/templates
```

### 8.8 上传模板

```http
POST /api/templates/upload
```

请求体示例：

```json
{
  "name": "测试上传模板",
  "style": "research",
  "description": "用于验证上传链路",
  "fileName": "demo-upload.docx",
  "fileContentBase64": "..."
}
```

### 8.9 更新模板

```http
PUT /api/templates/:id
```

### 8.10 预览任务解析结果

```http
POST /api/tasks/preview
```

请求体示例：

```json
{
  "rawPrompt": "分析面向中小企业的低代码平台竞品，重点看产品定位、商业模式和机会点",
  "preferredTemplateId": "tpl-research-zh",
  "preferredStyle": "research",
  "limit": 4,
  "retrievalMode": "hybrid"
}
```

### 8.11 创建任务

```http
POST /api/tasks
```

### 8.12 执行任务

```http
POST /api/tasks/:id/run
```

### 8.13 获取任务列表

```http
GET /api/tasks
```

### 8.14 获取报告信息

```http
GET /api/reports/:id
```

## 9. 报告生成流程说明

系统在执行任务时大致经历以下步骤：

1. 解析用户自然语言需求
2. 识别行业、赛道、目标用户、风格和关注维度
3. 构造检索 query
4. 按检索模式调用：
   - Mock
   - Search API
   - SerpAPI(Baidu)
   - Skill Bridge
   - Hybrid
5. 发现候选竞品
6. 逐个抽取结构化竞品信息
7. 根据图表需要追加图表专用检索
8. 根据结构化数据与图表检索结果共同构建图表
9. 分章节生成长篇报告
10. 输出图表文件
11. 导出 Word 文档

主编排代码位置：

- [analysis-pipeline.ts](/Users/sagima/competitive-report-studio/packages/orchestrator/src/analysis-pipeline.ts)

## 10. 输出文件说明

### 10.1 Word 报告

默认生成两个 Word 文件：

- `*.editable.docx`
- `*.final.docx`

这两个文件当前内容通常相同，后续可以扩展为：

- `editable`
  - 保留更多可编辑结构
- `final`
  - 用于正式汇报版本

如果章节内容由大模型返回 Markdown，系统会在写入 Word 前进行 Markdown 转换。
当前已支持把 Markdown 管道表格转换成 Word 表格。

### 10.2 图表资源

当前默认会生成 PNG 图表文件，例如：

- `feature-coverage-bar.png`

图表生成逻辑位置：

- [chart-renderer.ts](/Users/sagima/competitive-report-studio/packages/charting/src/chart-renderer.ts)

当前图表生成前会补一轮图表专用检索，这一轮检索会直接沿用当前任务选择的检索模式：

- `Mock`
- `SerpAPI(Baidu)`
- `Search API`
- `Skill Bridge`
- `Hybrid`

## 11. 当前使用边界说明

这部分非常重要。

当前系统已经可以运行，但并不意味着已经达到完整生产可用状态。

### 11.1 可以期待的效果

- 能完整跑通一条从需求到报告的链路
- 能看到页面和接口的真实交互
- 能拿到真实 `.docx` 文件
- 能作为后续继续开发的基础版本
- 能切换不同检索模式
- 能接入外部 Search API 或 Skill Bridge

### 11.2 不应过度期待的效果

- 不要把当前报告内容当成正式行业研究结论
- 不要把当前候选竞品发现当成真实市场结果
- 不要把当前模板上传当成真实模板解析器
- 不要把当前内存数据当成长期保存的数据源

## 12. 常见问题

### 12.1 页面能打开，但保存按钮无效怎么办

先确认：

1. API 是否已启动
2. Web 是否已启动
3. `http://127.0.0.1:4100/api/health` 是否返回 `{"ok":true}`

如果 API 未启动，前端按钮不会成功调用后端。

### 12.2 为什么修改模型配置后，重启服务就丢了

因为当前模型配置保存在内存中，没有接数据库。

### 12.3 为什么模板上传成功了，但不会自动识别 Word 占位符

因为当前上传能力仅完成：

- 文件保存
- 模板记录创建
- 章节配置维护

真实的 `.docx` 占位符解析尚未接入。

### 12.4 为什么报告已经比以前长了，但还不够像真正咨询报告

核心原因有两个：

1. 当前用的是 demo provider
2. 当前检索源是 mock 数据

如果接入真实模型和真实中文互联网检索，报告质量会明显提升。

### 12.4.1 为什么现在不会一直卡住直到浏览器超时

当前任务已经改成后台异步执行：

- 提交后立即返回
- 后端按阶段推进
- 前端轮询任务状态与进度条

因此浏览器不再需要一直等待一个超长同步请求。

### 12.5 为什么某些行业解析还不够准确

当前 demo 解析器做了关键词分支处理，已经能区分：

- AI 办公助手
- 低代码平台
- 生鲜电商

但它不是真正的通用行业解析器。

### 12.6 为什么某些赛道候选竞品为空

如果你当前选择的是：

- `Mock`

那么候选竞品依赖本地示例检索源，只覆盖少数赛道。

如果你选择的是：

- `Search API`
- `Skill Bridge`
- `Hybrid`

则需要先在设置页配置好对应的 endpoint 和 key。

### 12.7 Search API 和 Skill Bridge 的区别是什么

- `Search API`
  - 主系统直接请求真实搜索接口
  - 更适合通用开放赛道检索
- `Skill Bridge`
  - 主系统请求一个桥接服务
  - 桥接服务再调用自定义 Skill、规则引擎或站点抓取逻辑
  - 更适合复杂站点、垂直站点和已有 Skill 体系

## 13. Search API 与 Skill Bridge 配置说明

### 13.1 Search API 期望接口

主系统当前期望一个 GET 接口，最少支持这些参数：

- `q`
- `language`
- `time_range`

返回体示例：

```json
{
  "results": [
    {
      "url": "https://example.com/a",
      "title": "标题",
      "content": "摘要",
      "published_at": "2026-03-23T00:00:00Z",
      "source_type": "news"
    }
  ]
}
```

### 13.1.1 SerpAPI(Baidu) 专用模式

当前系统已经把 `SerpAPI(Baidu)` 作为单独检索模式接入。

因此请注意：

- 不要把 `https://serpapi.com/search?engine=baidu` 填进通用 `Search API Endpoint`
- 而应该在设置页的“检索配置”里填写：
  - `SerpAPI(Baidu) Key`
- 在新建任务页里选择：
  - `SerpAPI(Baidu)`

原因是 SerpAPI 的鉴权方式和返回结构与通用 Search API 不同，系统已经为它做了专用适配。

### 13.2 Skill Bridge 期望接口

主系统当前期望一个 POST 接口：

- `POST /search`

请求体示例：

```json
{
  "query": "中国低代码平台 竞品 官网 产品介绍",
  "timeRange": "近 12 个月",
  "language": "zh-CN",
  "sourceHints": []
}
```

返回体示例：

```json
{
  "results": [
    {
      "url": "https://example.com/a",
      "title": "标题",
      "snippet": "摘要",
      "publishedAt": "2026-03-23T00:00:00Z",
      "sourceType": "industry_media",
      "credibilityScore": 0.78
    }
  ]
}
```

### 13.3 Skill Bridge 示例服务

仓库已经提供一个可运行的 bridge 示例服务：

- [apps/skill-bridge/src/index.ts](/Users/sagima/competitive-report-studio/apps/skill-bridge/src/index.ts)

它支持两种模式：

1. 配置 `BRIDGE_UPSTREAM_SEARCH_ENDPOINT`
   - 转发到真实搜索接口
2. 不配置上游
   - 返回一个可用于联调的通用兜底结果

### 13.4 推荐接入方式

如果你的目标是“尽快支持开放赛道”：

1. 优先接 `Search API`
2. 再用 `Hybrid` 作为过渡

如果你的目标是“站点抓取规则复杂、已有 Skill 体系”：

1. 优先接 `Skill Bridge`
2. 再逐步把 Skill 能力沉淀成稳定服务

## 13. 推荐使用方式

如果你是演示和原型验证阶段，推荐这样用：

1. 启动 API
2. 启动 Web
3. 在模型设置页熟悉路由逻辑
4. 在模板管理页上传一个测试模板
5. 在任务创建页输入自然语言需求
6. 先点“解析需求”
7. 再点“创建并运行”
8. 打开生成的 `.docx`

如果你准备继续把它做成正式系统，推荐优先做：

1. 数据库持久化
2. 真实搜索和抓取
3. 真实模型接入
4. 报告详情页真实化
5. Word 模板占位符解析

## 14. 运维与开发建议

### 14.1 当前开发入口

- API 启动脚本
  - [package.json](/Users/sagima/competitive-report-studio/package.json)
- Web 启动脚本
  - [apps/web/package.json](/Users/sagima/competitive-report-studio/apps/web/package.json)

### 14.2 关键后端模块

- 模型管理
  - [model-service.ts](/Users/sagima/competitive-report-studio/apps/api/src/modules/models/model-service.ts)
- 模板管理
  - [template-service.ts](/Users/sagima/competitive-report-studio/apps/api/src/modules/templates/template-service.ts)
- 流水线服务
  - [pipeline-service.ts](/Users/sagima/competitive-report-studio/apps/api/src/modules/pipeline/pipeline-service.ts)
- Mock 检索
  - [mock-search-provider.ts](/Users/sagima/competitive-report-studio/apps/api/src/modules/pipeline/mock-search-provider.ts)

### 14.3 关键前端组件

- 设置页控制台
  - [settings-console.tsx](/Users/sagima/competitive-report-studio/apps/web/src/components/settings-console.tsx)
- 模板页控制台
  - [template-console.tsx](/Users/sagima/competitive-report-studio/apps/web/src/components/template-console.tsx)
- 任务页控制台
  - [task-console.tsx](/Users/sagima/competitive-report-studio/apps/web/src/components/task-console.tsx)

## 15. 后续迭代建议

建议按下面顺序继续推进：

### 第一优先级

- 接 PostgreSQL 持久化模型、模板、任务、报告
- 接 Redis / BullMQ 做任务队列
- 把报告详情页改为真实数据页

### 第二优先级

- 接真实中文搜索服务
- 接网页抓取与正文抽取
- 接真实大模型

### 第三优先级

- 支持用户确认候选竞品
- 支持只更新单个竞品
- 支持只重写某一章
- 支持只刷新图表

### 第四优先级

- 支持 Word 模板占位符自动解析
- 支持更丰富图表
- 支持参考来源在正文中的精确引用

## 16. 结语

当前版本已经具备“本地可运行、主要页面可操作、可生成 Word 报告”的基础能力，适合作为：

- 内部产品原型
- 二次开发起点
- 演示版本
- 后续生产化重构基础

当前 v2.1 相比 v2.0，已经进一步改善了报告章节之间的连贯性和导出版式细节，更适合继续朝“可直接交付的竞品分析报告系统”方向演进。

如果你准备继续扩展这个项目，建议把本文档与架构文档一起使用：

- [architecture.zh-CN.md](/Users/sagima/competitive-report-studio/docs/architecture.zh-CN.md)
- [user-manual.zh-CN.md](/Users/sagima/competitive-report-studio/docs/user-manual.zh-CN.md)
