<template>
  <AppShell
    title="开始一项智能任务"
    subtitle="选择你现在要完成的工作，系统会把复杂配置放到后面，只保留最直接的下一步。"
  >
    <div class="workbench-grid">
      <RouterLink class="workbench-card primary" to="/tasks/new">
        <span class="workbench-kicker">竞品分析</span>
        <strong>我要生成一份竞品分析报告</strong>
        <span>填写一句需求，确认竞品名单，生成可下载的 Word 报告。</span>
        <em>开始创建</em>
      </RouterLink>

      <RouterLink class="workbench-card" to="/tasks/new">
        <span class="workbench-kicker">已有材料</span>
        <strong>我已有竞品资料，想直接生成报告</strong>
        <span>上传每个竞品的资料，系统会从文档里抽取信息并写成报告。</span>
        <em>上传材料</em>
      </RouterLink>

      <RouterLink class="workbench-card" to="/gantt/new">
        <span class="workbench-kicker">项目规划</span>
        <strong>我要生成一个项目甘特图</strong>
        <span>输入目标、工期和截止日期，生成可编辑的任务排期。</span>
        <em>创建甘特图</em>
      </RouterLink>

      <RouterLink class="workbench-card" to="/tasks">
        <span class="workbench-kicker">继续工作</span>
        <strong>我想查看历史任务和报告</strong>
        <span>回到已经创建的任务，查看进度、下载报告或继续重试。</span>
        <em>查看历史</em>
      </RouterLink>
    </div>

    <SectionCard title="推荐路径" description="第一次演示或培训时，建议按这个顺序走。">
      <div class="path-row">
        <div><strong>1. 创建任务</strong><span>先用一句自然语言描述要分析什么。</span></div>
        <div><strong>2. 确认名单</strong><span>系统解析后，再勾选要纳入报告的竞品。</span></div>
        <div><strong>3. 等待生成</strong><span>任务会后台执行，完成后在详情页下载 Word。</span></div>
      </div>
    </SectionCard>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
</script>
