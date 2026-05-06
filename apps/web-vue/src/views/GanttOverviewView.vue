<template>
  <AppShell
    title="开始一个项目排期"
    subtitle="选择你要规划的项目类型，系统会引导你填写目标、时间边界和关键约束。"
  >
    <div class="workbench-grid">
      <RouterLink class="workbench-card primary" to="/gantt/new">
        <span class="workbench-kicker">新建排期</span>
        <strong>我要把项目目标变成甘特图</strong>
        <span>输入项目目标、工期和截止时间，生成可编辑的阶段任务。</span>
        <em>开始规划</em>
      </RouterLink>

      <RouterLink class="workbench-card" to="/gantt/new">
        <span class="workbench-kicker">倒排计划</span>
        <strong>我有截止日期，需要倒推出时间表</strong>
        <span>适合上线、交付、活动筹备等有明确 deadline 的任务。</span>
        <em>按截止时间规划</em>
      </RouterLink>

      <RouterLink class="workbench-card" to="/gantt/new">
        <span class="workbench-kicker">正排计划</span>
        <strong>我有开始日期，需要安排执行节奏</strong>
        <span>适合从某一天开始推进的项目，按阶段向后排期。</span>
        <em>按开始时间规划</em>
      </RouterLink>

      <RouterLink class="workbench-card" to="/gantt/history">
        <span class="workbench-kicker">继续编辑</span>
        <strong>我想查看或调整历史甘特图</strong>
        <span>回到已生成的计划，继续编辑任务、日期和风险提示。</span>
        <em>查看历史</em>
      </RouterLink>
    </div>

    <SectionCard title="推荐路径" description="第一次使用时，按这个顺序就够了。">
      <div class="path-row">
        <div>
          <strong>1. 说明项目</strong>
          <span>写清楚项目目标、交付物和时间范围。</span>
        </div>
        <div>
          <strong>2. 生成计划</strong>
          <span>系统会拆出阶段、任务依赖、里程碑和风险。</span>
        </div>
        <div>
          <strong>3. 微调导出</strong>
          <span>在表格里改日期和任务名，再导出给团队确认。</span>
        </div>
      </div>
    </SectionCard>

    <SectionCard title="常见场景" description="不知道怎么写项目目标时，可以从这些场景开始。">
      <div class="chip-row">
        <RouterLink class="chip" to="/gantt/new">产品版本发布</RouterLink>
        <RouterLink class="chip" to="/gantt/new">客户交付验收</RouterLink>
        <RouterLink class="chip" to="/gantt/new">运营活动筹备</RouterLink>
        <RouterLink class="chip" to="/gantt/new">内部专项推进</RouterLink>
      </div>
    </SectionCard>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";
import SectionCard from "@/components/SectionCard.vue";
</script>
