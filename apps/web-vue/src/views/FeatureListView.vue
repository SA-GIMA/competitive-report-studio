<template>
  <AppShell
    title="智能功能清单生成总览"
    subtitle="这一条能力线仍在建设中，后续会把自然语言需求整理成结构化功能清单。"
  >
    <div class="hero-grid">
      <section class="hero-panel">
        <p class="eyebrow" style="color: rgba(255,255,255,.72)">规划中的第二条能力线</p>
        <h2>把自然语言需求自动拆成结构化功能清单</h2>
        <p>后续会支持从业务目标出发，自动整理模块、字段、优先级、依赖关系与验收建议。</p>
        <div class="hero-actions">
          <RouterLink class="button secondary" to="/settings">先配置模型</RouterLink>
        </div>
      </section>
      <section class="hero-note">
        <strong>预期输出</strong>
        <ul>
          <li>功能模块树</li>
          <li>字段与规则清单</li>
          <li>优先级建议</li>
          <li>验收口径草案</li>
        </ul>
      </section>
    </div>

    <SectionCard title="建设中" description="页面和后端流程尚未接入。">
      <div class="empty">智能功能清单生成正在建设中，当前先保留总览页方便统一展示产品规划。</div>
    </SectionCard>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
</script>
