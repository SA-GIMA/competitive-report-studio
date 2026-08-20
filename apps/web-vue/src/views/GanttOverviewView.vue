<template>
  <AppShell
    title="智能甘特图生成总览"
    subtitle="把项目目标、时间边界和关键约束转成可编辑的阶段任务与里程碑计划。"
  >
    <div class="gantt-overview">
      <section class="gantt-hero">
        <div>
          <h2>让项目排期从一句目标开始</h2>
          <p>输入项目目标、截止日期、工作日规则和交付约束，系统会自动拆解阶段、任务、里程碑与风险提示，生成可继续编辑的甘特图计划。</p>
          <div class="hero-actions">
            <RouterLink class="primary-action" to="/gantt/new">创建甘特图</RouterLink>
            <RouterLink class="secondary-action" to="/gantt/history">查看历史</RouterLink>
          </div>
        </div>
        <div class="timeline-preview" aria-hidden="true">
          <span style="--x: 0%; --w: 56%; --c: #2563eb"></span>
          <span style="--x: 18%; --w: 68%; --c: #16a34a"></span>
          <span style="--x: 42%; --w: 42%; --c: #f59e0b"></span>
          <i style="--x: 18%"></i>
          <i style="--x: 56%"></i>
          <i style="--x: 84%"></i>
        </div>
      </section>

      <section class="metric-grid">
        <article>
          <span>2</span>
          <strong>正排 / 倒排</strong>
          <p>既支持从开始日期向后规划，也支持按截止日期倒推关键节点。</p>
        </article>
        <article>
          <span>100%</span>
          <strong>任务可编辑</strong>
          <p>生成后可直接调整任务名称、负责人、日期、依赖和风险提示。</p>
        </article>
        <article>
          <span>1-click</span>
          <strong>历史复用</strong>
          <p>已生成计划会保留在历史中，方便复盘、微调和继续迭代。</p>
        </article>
      </section>

      <section class="overview-panels">
        <article class="panel">
          <header>
            <h3>推荐路径</h3>
            <RouterLink to="/gantt/new">开始规划 →</RouterLink>
          </header>
          <div class="steps">
            <div><span>1</span><strong>说明项目</strong><p>写清楚项目目标、交付物和时间范围。</p></div>
            <div><span>2</span><strong>生成计划</strong><p>系统拆出阶段、任务依赖、里程碑和风险。</p></div>
            <div><span>3</span><strong>微调导出</strong><p>在表格里改日期和任务名，再给团队确认。</p></div>
          </div>
        </article>

        <article class="panel">
          <header>
            <h3>常见场景</h3>
            <RouterLink to="/gantt/history">历史计划 →</RouterLink>
          </header>
          <div class="scenario-grid">
            <RouterLink to="/gantt/new">产品版本发布</RouterLink>
            <RouterLink to="/gantt/new">客户交付验收</RouterLink>
            <RouterLink to="/gantt/new">运营活动筹备</RouterLink>
            <RouterLink to="/gantt/new">内部专项推进</RouterLink>
          </div>
        </article>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";
</script>

<style scoped>
.gantt-overview {
  display: grid;
  gap: 26px;
}

.gantt-hero,
.metric-grid article,
.panel {
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  background: #ffffff;
}

.gantt-hero {
  min-height: 300px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 34px;
  align-items: center;
  padding: 34px;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  overflow: hidden;
}

.gantt-hero h2 {
  margin: 0;
  font-size: 34px;
  line-height: 1.2;
}

.gantt-hero p {
  max-width: 720px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.92);
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
  border-radius: 8px;
  padding: 0 22px;
  font-weight: 800;
}

.primary-action {
  background: #ffffff;
  color: #2563eb;
}

.secondary-action {
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.timeline-preview {
  position: relative;
  min-height: 190px;
  border-radius: 18px;
  padding: 34px;
  background: rgba(255, 255, 255, 0.12);
}

.timeline-preview::before {
  content: "";
  position: absolute;
  left: 34px;
  right: 34px;
  top: 54px;
  bottom: 46px;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.18) 1px, transparent 1px, transparent 25%);
}

.timeline-preview span {
  position: relative;
  z-index: 1;
  display: block;
  width: var(--w);
  height: 22px;
  margin-top: 24px;
  margin-left: var(--x);
  border-radius: 999px;
  background: color-mix(in srgb, var(--c), white 30%);
}

.timeline-preview i {
  position: absolute;
  z-index: 2;
  left: calc(34px + var(--x));
  bottom: 24px;
  width: 12px;
  height: 12px;
  border: 3px solid #ffffff;
  border-radius: 999px;
  background: #f59e0b;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
}

.metric-grid article {
  padding: 24px;
}

.metric-grid span {
  display: block;
  color: #2563eb;
  font-size: 32px;
  font-weight: 900;
}

.metric-grid strong {
  display: block;
  margin-top: 10px;
  color: #1d293d;
  font-size: 17px;
}

.metric-grid p {
  margin: 10px 0 0;
  color: #66758c;
  font-size: 13px;
  line-height: 1.65;
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

.panel h3 {
  margin: 0;
  color: #1d293d;
  font-size: 18px;
}

.panel header a {
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.steps,
.scenario-grid {
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
}

.steps p {
  margin: 6px 0 0;
  color: #66758c;
  font-size: 13px;
}

.scenario-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.scenario-grid a {
  min-height: 72px;
  display: flex;
  align-items: center;
  border: 1px solid #e3eaf3;
  border-radius: 12px;
  padding: 0 18px;
  color: #2b3d55;
  font-weight: 800;
  background: #f8fbff;
}

@media (max-width: 1100px) {
  .gantt-hero,
  .overview-panels {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
