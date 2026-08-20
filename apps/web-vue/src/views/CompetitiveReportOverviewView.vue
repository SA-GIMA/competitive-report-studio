<template>
  <AppShell
    title="智能竞品分析报告生成总览"
    subtitle="把中文互联网检索、结构化抽取、图表生成与 Word 汇报串成一条可追溯流水线。"
  >
    <div class="report-overview">
      <section class="hero-layout">
        <div class="overview-hero">
          <div class="hero-copy">
            <h2>重新定义竞品分析</h2>
            <p>
              整合全球超过 50 个主流数据源，通过多 Agent 协同架构，将传统需耗时一周的
              竞品调研工作缩短至 15 分钟以内。生成结构化、专业级、具备落地指导意义的深度报告。
            </p>
            <div class="hero-actions">
              <RouterLink class="hero-primary" to="/tasks/new">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                立即创建任务
              </RouterLink>
              <RouterLink class="hero-secondary" to="/settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M2 14h4" /><path d="M10 8h4" /><path d="M18 16h4" /></svg>
                配置模型与检索
              </RouterLink>
            </div>
          </div>
          <div class="hero-illustration" aria-hidden="true">
            <div class="mic-head"></div>
            <div class="mic-body"></div>
            <div class="mic-stem"></div>
            <div class="mic-base"></div>
            <div class="mic-arc"></div>
          </div>
        </div>

        <aside class="question-card">
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8.5 14a6 6 0 1 1 7 0c-.9.6-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.9-1.5-2.5Z" /></svg>
            领导视角通常会关注什么
          </h3>
          <ol>
            <li><span>1</span><p><strong>核心差异化优势：</strong>竞品在哪些关键维度领先我们？</p></li>
            <li><span>2</span><p><strong>市场响应速度：</strong>竞品近期的技术迭代频率及主要方向？</p></li>
            <li><span>3</span><p><strong>成本优化空间：</strong>相比竞品，我们在工程实现上的成本冗余？</p></li>
            <li><span>4</span><p><strong>技术落地可行性：</strong>分析报告中的建议是否具备可操作性？</p></li>
          </ol>
        </aside>
      </section>

      <section class="metric-grid" aria-label="核心能力指标">
        <article class="overview-metric">
          <span class="metric-icon purple" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m21 21-5-5" /><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" /></svg>
          </span>
          <div>
            <small>灵活检索</small>
            <strong>5+</strong>
            <span>可切换检索模式</span>
            <p>支持深度网页、知识库、技术论文、社交媒体及专有数据库检索。</p>
          </div>
        </article>
        <article class="overview-metric">
          <span class="metric-icon blue" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m12 3 9 4.5-9 4.5-9-4.5 9-4.5Z" /><path d="m3 12 9 4.5 9-4.5" /><path d="m3 16.5 9 4.5 9-4.5" /></svg>
          </span>
          <div>
            <small>报告深度</small>
            <strong>11</strong>
            <span>默认深度章节模板</span>
            <p>包含功能对比、商业模式、技术栈拆解、用户评价情感分析等核心板块。</p>
          </div>
        </article>
        <article class="overview-metric">
          <span class="metric-icon green" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 3v3" /><path d="M15 3v3" /><path d="M9 18v3" /><path d="M15 18v3" /><path d="M3 9h3" /><path d="M3 15h3" /><path d="M18 9h3" /><path d="M18 15h3" /><path d="M7 7h10v10H7z" /><path d="M10 10h4v4h-4z" /></svg>
          </span>
          <div>
            <small>自定义程度</small>
            <strong>100%</strong>
            <span>模型与模板可配置</span>
            <p>完全自定义检索源、分析维度、输出格式及使用的底层模型实例。</p>
          </div>
        </article>
      </section>

      <section class="overview-panels">
        <article class="execution-card">
          <header>
            <div>
              <h3>分阶段自动化执行</h3>
              <p>流水线式作业，确保每一环报告内容的真实性与深度</p>
            </div>
            <RouterLink class="mini-link" to="/tasks/new">创建任务</RouterLink>
          </header>
          <div class="pipeline">
            <div v-for="(step, index) in pipelineSteps" :key="step.title" class="pipeline-step" :class="{ active: index === 0 }">
              <span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="step.icon" /></svg>
              </span>
              <strong>{{ step.title }}</strong>
            </div>
          </div>
          <div class="mode-box">
            <strong>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v-5" /><path d="M12 7h.01" /><path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" /></svg>
              当前运行模式：深度对标模式
            </strong>
            <p>
              系统将启动 3 个独立的搜索 Agent 与 1 个分析 Agent 并行工作。该模式下报告平均长度约
              4500 字，含功能对标矩阵及 SWOT 分析。
            </p>
          </div>
        </article>

        <article class="config-card">
          <header>
            <div>
              <h3>配置驱动报告架构</h3>
              <p>完全按需定制的生成链路与产物格式</p>
            </div>
            <RouterLink class="text-action" to="/settings">前往设置 →</RouterLink>
          </header>
          <div class="config-list">
            <div class="config-item">
              <span class="config-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 8h4v4H4z" /><path d="M16 4h4v4h-4z" /><path d="M16 16h4v4h-4z" /><path d="M8 10h4a4 4 0 0 0 4-4" /><path d="M8 10h4a4 4 0 0 1 4 4v2" /></svg>
              </span>
              <div>
                <strong>模型路由 (Model Routing)</strong>
                <p>为不同章节（摘要、代码分析、商业分析）分配最适合的推理模型。</p>
              </div>
              <em>GPT-4o / Claude 3.5</em>
            </div>
            <div class="config-item">
              <span class="config-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m21 21-4.3-4.3" /><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" /><path d="m9 11 1.4 1.4L14 9" /></svg>
              </span>
              <div>
                <strong>检索模式 (Search Mode)</strong>
                <p>配置递归深度检索或混合语义检索，决定信息获取的广度与精准度。</p>
              </div>
              <em>Recursive / Hybrid</em>
            </div>
            <div class="config-item">
              <span class="config-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5" /><path d="M9 14h6" /><path d="M9 17h6" /></svg>
              </span>
              <div>
                <strong>模板与导出 (Template & Export)</strong>
                <p>自定义报告样式模板，支持一键导出为企业级报表或可编辑的 Markdown 文件。</p>
              </div>
              <em>PDF / MD / Excel</em>
            </div>
          </div>
        </article>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";

const pipelineSteps = [
  { title: "需求解析", icon: "M7 7h10M7 12h7M7 17h4" },
  { title: "全网检索", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" },
  { title: "内容过滤", icon: "M4 5h16l-6 7v5l-4 2v-7L4 5Z" },
  { title: "AI生成", icon: "M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" },
  { title: "人工审阅", icon: "M9 12l2 2 4-4M5 5h14v14H5z" }
];
</script>

<style scoped>
.report-overview {
  display: grid;
  gap: 34px;
}

.report-overview svg {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 404px;
  gap: 26px;
}

.overview-hero,
.question-card,
.overview-metric,
.execution-card,
.config-card {
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  background: #ffffff;
}

.overview-hero {
  position: relative;
  min-height: 326px;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 36px 34px;
  background: linear-gradient(135deg, #2563eb 0%, #4387f6 100%);
  color: #ffffff;
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 780px;
}

.hero-copy h2 {
  margin: 0;
  font-size: 34px;
  line-height: 1.18;
}

.hero-copy p {
  margin: 22px 0 0;
  max-width: 720px;
  color: rgba(255, 255, 255, 0.94);
  font-size: 17px;
  font-weight: 650;
  line-height: 1.65;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 32px;
}

.hero-primary,
.hero-secondary {
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 8px;
  padding: 0 26px;
  font-size: 17px;
  font-weight: 800;
}

.hero-primary {
  background: #ffffff;
  color: #2563eb;
}

.hero-secondary {
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.hero-illustration {
  position: absolute;
  right: 48px;
  bottom: 20px;
  width: 180px;
  height: 220px;
  opacity: 0.18;
}

.mic-head,
.mic-body,
.mic-stem,
.mic-base,
.mic-arc {
  position: absolute;
  background: #ffffff;
}

.mic-head {
  top: 10px;
  left: 52px;
  width: 75px;
  height: 148px;
  border-radius: 36px;
}

.mic-head::after {
  content: "";
  position: absolute;
  top: 25px;
  left: 26px;
  width: 24px;
  height: 24px;
  background: #2563eb;
}

.mic-body {
  top: 86px;
  left: 78px;
  width: 50px;
  height: 50px;
  background: #2563eb;
}

.mic-stem {
  left: 85px;
  bottom: 48px;
  width: 50px;
  height: 25px;
  border-radius: 999px;
}

.mic-base {
  left: 48px;
  bottom: 0;
  width: 124px;
  height: 25px;
  border-radius: 999px;
}

.mic-arc {
  right: -30px;
  bottom: 0;
  width: 116px;
  height: 150px;
  border: 28px solid #ffffff;
  border-left: 0;
  border-radius: 0 100px 100px 0;
  background: transparent;
}

.question-card {
  min-height: 326px;
  padding: 28px 26px;
}

.question-card h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 26px;
  color: #1d293d;
  font-size: 18px;
}

.question-card h3 svg {
  color: #f59e0b;
}

.question-card ol {
  display: grid;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.question-card li {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 12px;
  color: #31435b;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.55;
}

.question-card li p {
  margin: 0;
}

.question-card li span {
  width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 12px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
}

.overview-metric {
  min-height: 168px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  padding: 26px;
}

.metric-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 24px;
}

.metric-icon.purple {
  color: #9333ea;
  background: #faf0ff;
}

.metric-icon.blue {
  color: #2563eb;
  background: #edf4ff;
}

.metric-icon.green {
  color: #16a34a;
  background: #edfdf3;
}

.overview-metric small {
  display: block;
  margin: 5px 0 18px;
  color: #5d6d84;
  font-size: 14px;
  font-weight: 800;
}

.overview-metric strong {
  display: inline-block;
  margin-right: 10px;
  color: #1d293d;
  font-size: 32px;
  line-height: 1;
}

.overview-metric span {
  color: #8b9ab0;
  font-size: 14px;
  font-weight: 700;
}

.overview-metric p {
  margin: 12px 0 0;
  color: #75869f;
  font-size: 13px;
  line-height: 1.55;
}

.overview-panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 34px;
}

.execution-card,
.config-card {
  overflow: hidden;
}

.execution-card header,
.config-card header {
  min-height: 98px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid #e7edf5;
  padding: 24px 26px;
}

.execution-card h3,
.config-card h3 {
  margin: 0;
  color: #1d293d;
  font-size: 18px;
}

.execution-card p,
.config-card p {
  margin: 8px 0 0;
  color: #75869f;
  font-size: 13px;
  line-height: 1.6;
}

.mini-link {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  border-radius: 9px;
  padding: 0 18px;
  background: #edf4ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: start;
  gap: 8px;
  padding: 70px 32px 48px;
}

.pipeline-step {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 16px;
  color: #8b9ab0;
  font-size: 13px;
  font-weight: 800;
}

.pipeline-step::before {
  content: "";
  position: absolute;
  top: 20px;
  left: -50%;
  width: 100%;
  height: 2px;
  background: #e6edf6;
}

.pipeline-step:first-child::before {
  display: none;
}

.pipeline-step span {
  position: relative;
  z-index: 1;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 2px solid #dbe3ef;
  border-radius: 999px;
  background: #ffffff;
  color: #90a2ba;
  font-size: 20px;
}

.pipeline-step.active {
  color: #1d293d;
}

.pipeline-step.active span {
  border-color: #2563eb;
  color: #2563eb;
}

.mode-box {
  margin: 0 34px 42px;
  border: 1px dashed #d8e3f1;
  border-radius: 14px;
  padding: 18px;
  background: #f8fbff;
}

.mode-box strong {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1d293d;
  font-size: 15px;
}

.mode-box strong svg {
  color: #2563eb;
}

.text-action {
  color: #31435b;
  font-size: 13px;
  font-weight: 800;
}

.config-list {
  display: grid;
  gap: 16px;
  padding: 26px;
}

.config-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 16px;
  border: 1px solid #edf2f7;
  border-radius: 14px;
  padding: 20px 18px;
  background: #ffffff;
}

.config-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #f1f5f9;
  color: #51627a;
  font-size: 18px;
}

.config-item strong {
  color: #2b3d55;
  font-size: 18px;
}

.config-item em {
  align-self: start;
  border-radius: 5px;
  padding: 4px 10px;
  background: #eef3f9;
  color: #61728a;
  font-size: 12px;
  font-style: normal;
}

@media (max-width: 1200px) {
  .hero-layout,
  .overview-panels {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .overview-hero {
    min-height: auto;
    padding: 28px 22px;
  }

  .hero-copy h2 {
    font-size: 28px;
  }

  .hero-illustration {
    display: none;
  }

  .pipeline {
    grid-template-columns: 1fr;
    padding: 32px 24px;
  }

  .pipeline-step::before {
    display: none;
  }

  .config-item {
    grid-template-columns: auto 1fr;
  }

  .config-item em {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
