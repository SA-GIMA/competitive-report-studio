<template>
  <AppShell
    title="智能竞品分析报告生成总览"
    subtitle="把中文互联网检索、结构化抽取、图表生成与 Word 汇报串成一条可追溯流水线。"
  >
    <div class="hero-grid">
      <section class="hero-panel">
        <p class="eyebrow" style="color: rgba(255,255,255,.72)">竞品分析自动化工作台</p>
        <h2>把中文互联网检索、图表生成与 Word 汇报串成一条可追溯流水线</h2>
        <p>面向领导汇报、行业研究和策略分析等场景，支持多模型路由、检索模式切换、模板管理和后台异步执行。</p>
        <div class="hero-actions">
          <RouterLink class="button secondary" to="/tasks/new">立即创建任务</RouterLink>
          <RouterLink class="button ghost" to="/settings">配置模型与检索</RouterLink>
        </div>
      </section>
      <section class="hero-note">
        <strong>领导视角下通常会关注什么</strong>
        <ul>
          <li>信息是否来自可信来源，是否能追溯。</li>
          <li>图表是否清晰，能否一眼看出差异和结论。</li>
          <li>汇报结构是否适合管理层阅读。</li>
          <li>生成过程是否稳定，失败后是否能快速定位与重试。</li>
        </ul>
      </section>
    </div>

    <div class="highlight-grid">
      <article class="metric"><strong>5+</strong><span>可切换检索模式</span></article>
      <article class="metric"><strong>11</strong><span>默认深度章节模板</span></article>
      <article class="metric"><strong>100%</strong><span>模型与模板可配置</span></article>
    </div>

    <div class="panel-grid" style="margin-top: 18px">
      <SectionCard title="分阶段执行" description="页面可看到任务步骤和进度，不再让浏览器阻塞等待。">
        <template #action><RouterLink class="button" to="/tasks/new">创建任务</RouterLink></template>
        <div class="chip-row">
          <span class="chip">规划模型</span>
          <span class="chip">中文检索</span>
          <span class="chip">信息抽取</span>
          <span class="chip">图表专用检索</span>
          <span class="chip">图表生成</span>
          <span class="chip">Word 导出</span>
        </div>
      </SectionCard>

      <SectionCard title="配置驱动架构" description="模型预设、任务路由、检索配置和模板结构都能独立配置。">
        <template #action><RouterLink class="button secondary" to="/settings">前往设置</RouterLink></template>
        <div class="list">
          <div class="list-item"><strong>模型路由</strong><span class="muted">规划、抽取、写作可绑定不同模型。</span></div>
          <div class="list-item"><strong>检索模式</strong><span class="muted">支持 Mock、Search API、SearXNG、Skill Bridge 等模式。</span></div>
          <div class="list-item"><strong>模板与导出</strong><span class="muted">通过模板占位符把章节、图表和附录映射到 Word 报告。</span></div>
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
