<template>
  <AppShell
    title="智能功能清单生成总览"
    subtitle="把自然语言需求自动拆解为结构化功能清单，支持模块、字段、优先级与验收标准的一体化管理。"
  >
    <div class="feature-overview">
      <section class="feature-hero">
        <div class="hero-content">
          <h2>让需求从模糊到结构化</h2>
          <p>告别杂乱的需求文档。输入自然语言描述的业务目标，系统会自动识别功能模块、字段规则、优先级与依赖关系，生成可直接落地的结构化功能清单。</p>
          <div class="hero-actions">
            <RouterLink class="primary-action" to="/feature-list/new">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              新建清单
            </RouterLink>
            <RouterLink class="secondary-action" to="/feature-list/history">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v6l4 2" /></svg>
              查看历史
            </RouterLink>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="structure-tree">
            <div class="tree-root">
              <span>业务目标</span>
              <div class="tree-children">
                <div class="tree-node">
                  <span>功能模块 A</span>
                  <div class="tree-children">
                    <div class="tree-leaf">字段规则</div>
                    <div class="tree-leaf">验收标准</div>
                  </div>
                </div>
                <div class="tree-node">
                  <span>功能模块 B</span>
                  <div class="tree-children">
                    <div class="tree-leaf">优先级</div>
                    <div class="tree-leaf">依赖关系</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="metric-grid" aria-label="核心能力">
        <article class="overview-metric">
          <span class="metric-icon purple" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 7h.01" /><path d="M7 12h.01" /><path d="M7 17h.01" /><path d="M11 7h7" /><path d="M11 12h7" /><path d="M11 17h7" /></svg>
          </span>
          <div>
            <small>智能拆解</small>
            <strong>自动</strong>
            <span>自然语言 → 结构化</span>
            <p>基于大模型理解能力，自动从模糊需求中提取功能模块、字段与业务规则。</p>
          </div>
        </article>
        <article class="overview-metric">
          <span class="metric-icon blue" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 3v3" /><path d="M15 3v3" /><path d="M9 18v3" /><path d="M15 18v3" /><path d="M3 9h3" /><path d="M3 15h3" /><path d="M18 9h3" /><path d="M18 15h3" /><path d="M7 7h10v10H7z" /><path d="M10 10h4v4h-4z" /></svg>
          </span>
          <div>
            <small>依赖分析</small>
            <strong>智能</strong>
            <span>识别模块间依赖</span>
            <p>自动分析功能模块之间的前后置依赖关系，生成优先级建议。</p>
          </div>
        </article>
        <article class="overview-metric">
          <span class="metric-icon green" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          <div>
            <small>验收标准</small>
            <strong>内置</strong>
            <span>自动生成验收口径</span>
            <p>每个功能模块附带可编辑的验收标准草案，便于后续测试与评审。</p>
          </div>
        </article>
      </section>

      <section class="overview-panels">
        <article class="panel">
          <header>
            <div>
              <h3>预期输出</h3>
              <p>智能功能清单将包含以下结构化内容</p>
            </div>
          </header>
          <div class="output-list">
            <div class="output-item">
              <span class="output-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 4h7v7H4z" /><path d="M13 4h7v7h-7z" /><path d="M4 13h7v7H4z" /><path d="M13 13h7v7h-7z" /></svg>
              </span>
              <div>
                <strong>功能模块树</strong>
                <p>按业务领域拆解的功能模块层级结构</p>
              </div>
            </div>
            <div class="output-item">
              <span class="output-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M7 7h.01" /><path d="M7 12h.01" /><path d="M7 17h.01" /><path d="M11 7h7" /><path d="M11 12h7" /><path d="M11 17h7" /></svg>
              </span>
              <div>
                <strong>字段与规则清单</strong>
                <p>每个模块下的字段定义、业务规则与校验逻辑</p>
              </div>
            </div>
            <div class="output-item">
              <span class="output-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              </span>
              <div>
                <strong>优先级建议</strong>
                <p>基于依赖关系和业务价值的优先级排序</p>
              </div>
            </div>
            <div class="output-item">
              <span class="output-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M9 3v3" /><path d="M15 3v3" /><path d="M9 18v3" /><path d="M15 18v3" /><path d="M3 9h3" /><path d="M3 15h3" /><path d="M18 9h3" /><path d="M18 15h3" /></svg>
              </span>
              <div>
                <strong>验收口径草案</strong>
                <p>可编辑的功能验收标准与测试建议</p>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <header>
            <div>
              <h3>使用流程</h3>
              <p>从需求到结构化清单的三步过程</p>
            </div>
          </header>
          <div class="steps">
            <div>
              <span>1</span>
              <strong>输入业务目标</strong>
              <p>用自然语言描述你想要实现的业务场景和目标。</p>
            </div>
            <div>
              <span>2</span>
              <strong>AI 自动拆解</strong>
              <p>系统理解需求语义，自动提取模块、字段、规则与依赖。</p>
            </div>
            <div>
              <span>3</span>
              <strong>微调与导出</strong>
              <p>在可视化编辑器中调整优先级和规则，导出结构化清单。</p>
            </div>
          </div>
        </article>
      </section>

      <SectionCard title="已经接入" description="当前版本支持自然语言生成、结构化编辑、历史保存和 Markdown 导出。">
        <div class="building-notice">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
          <p>输入产品目标后，系统会生成模块树、功能点、字段表、优先级和验收标准；生成结果可以继续编辑、保存到历史，并导出为 Markdown 文件。</p>
        </div>
      </SectionCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
</script>

<style scoped>
.feature-overview svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.feature-overview {
  display: grid;
  gap: 26px;
}

.feature-hero,
.metric-grid article,
.panel {
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  background: #ffffff;
}

.feature-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 34px;
  align-items: center;
  padding: 34px;
  background: linear-gradient(135deg, #2563eb 0%, #4387f6 100%);
  overflow: hidden;
}

.hero-content h2 {
  margin: 0;
  color: #ffffff;
  font-size: 34px;
  line-height: 1.2;
}

.hero-content p {
  max-width: 600px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 30px;
}

.primary-action,
.secondary-action {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  padding: 0 22px;
  background: #ffffff;
  color: #2563eb;
  font-weight: 800;
}

.primary-action {
  background: #ffffff;
  color: #2563eb;
}

.secondary-action {
  border: 1px solid rgba(255, 255, 255, 0.56);
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.primary-action svg,
.secondary-action svg {
  width: 18px;
  height: 18px;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.structure-tree {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  padding: 24px;
  backdrop-filter: blur(10px);
}

.tree-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.tree-root > span {
  background: #fbbf24;
  color: #1e3a5f;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
}

.tree-children {
  display: flex;
  gap: 16px;
}

.tree-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.tree-node > span {
  background: #60a5fa;
  color: #1e3a5f;
  font-weight: 700;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 6px;
}

.tree-node .tree-children {
  margin-top: 4px;
}

.tree-leaf {
  background: rgba(255, 255, 255, 0.9);
  color: #1e3a5f;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
}

.overview-metric {
  display: flex;
  gap: 16px;
  padding: 24px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.metric-icon.purple {
  background: #eff6ff;
  color: #60a5fa;
}

.metric-icon.blue {
  background: #eff6ff;
  color: #60a5fa;
}

.metric-icon.green {
  background: #eff6ff;
  color: #60a5fa;
}

.metric-icon svg {
  width: 24px;
  height: 24px;
}

.overview-metric small {
  color: #60a5fa;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.overview-metric strong {
  display: block;
  margin-top: 4px;
  color: #1e3a5f;
  font-size: 24px;
  font-weight: 900;
}

.overview-metric span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-top: 2px;
}

.overview-metric p {
  margin: 10px 0 0;
  color: #66758c;
  font-size: 13px;
  line-height: 1.6;
}

.overview-panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 26px;
}

.panel {
  overflow: hidden;
}

.panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #e7edf5;
  padding: 22px 24px;
}

.panel header > div {
  flex: 1;
}

.panel h3 {
  margin: 0;
  color: #1d293d;
  font-size: 18px;
}

.panel header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.output-list {
  display: grid;
  gap: 14px;
  padding: 24px;
}

.output-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px;
  border: 1px solid #e3eaf3;
  border-radius: 10px;
}

.output-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #60a5fa;
  flex-shrink: 0;
}

.output-icon svg {
  width: 18px;
  height: 18px;
}

.output-item strong {
  display: block;
  color: #1d293d;
  font-size: 14px;
}

.output-item p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.steps {
  display: grid;
  gap: 14px;
  padding: 24px;
}

.steps div {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 14px;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 16px;
}

.steps span {
  grid-row: span 2;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 900;
}

.steps strong {
  color: #1d293d;
  font-size: 14px;
}

.steps p {
  grid-column: 2;
  margin: 6px 0 0;
  color: #66758c;
  font-size: 13px;
  line-height: 1.5;
}

.building-notice {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
  border: 1px solid #fcd34d;
}

.building-notice svg {
  width: 22px;
  height: 22px;
  color: #60a5fa;
  flex-shrink: 0;
}

.building-notice p {
  margin: 0;
  color: #92400e;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .feature-hero {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    display: none;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .overview-panels {
    grid-template-columns: 1fr;
  }
}
</style>
