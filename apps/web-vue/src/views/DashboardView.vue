<template>
  <AppShell title="开始一项智能任务" subtitle="选择你现在要完成的工作，系统会把复杂配置放到后面，只保留最直接的下一步">
    <div class="dashboard-home">
      <section class="content-panel">
        <div class="task-grid">
          <RouterLink class="task-card" to="/tasks/new">
            <span class="task-icon blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 3h7l4 4v14H7z" />
                <path d="M14 3v5h5" />
                <path d="M10 15h4" />
                <path d="M10 18h6" />
              </svg>
            </span>
            <span class="task-copy">
              <strong>我要生成一份竞品分析报告</strong>
              <small>利用多Agent协同，深度分析市场格局、技术差异与竞争对手动态。</small>
            </span>
            <span class="primary-action">
              开始创建
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </span>
          </RouterLink>

          <RouterLink class="task-card" to="/tasks/new">
            <span class="task-icon purple" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 17V9" />
                <path d="m8.5 12.5 3.5-3.5 3.5 3.5" />
                <path d="M19 17a4 4 0 0 0-3.7-5.5A5.5 5.5 0 0 0 4.7 13 3.3 3.3 0 0 0 6 19h12a3 3 0 0 0 1-5.8" />
              </svg>
            </span>
            <span class="task-copy">
              <strong>我已有竞品资料，想直接生成报告</strong>
              <small>上传本地PDF、Docx或会议记录，AI将自动提取关键点并按模板结构化。</small>
            </span>
            <span class="secondary-action">
              上传材料
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m21.4 11.6-8.5 8.5a5 5 0 0 1-7.1-7.1l9.2-9.2a3.2 3.2 0 0 1 4.6 4.6l-9.2 9.2a1.5 1.5 0 0 1-2.1-2.1l8.5-8.5" />
              </svg>
            </span>
          </RouterLink>

          <RouterLink class="task-card" to="/gantt/new">
            <span class="task-icon orange" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M7 7h10" />
                <path d="M7 12h6" />
                <path d="M7 17h12" />
              </svg>
            </span>
            <span class="task-copy">
              <strong>我要生成一个项目甘特图</strong>
              <small>根据项目需求描述，智能规划里程碑，自动生成任务时间线与甘特图。</small>
            </span>
            <span class="secondary-action">
              创建甘特图
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
                <path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                <path d="M9 15h6" />
              </svg>
            </span>
          </RouterLink>

          <RouterLink class="task-card" to="/tasks">
            <span class="task-icon green" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <path d="M12 7v6l4 2" />
              </svg>
            </span>
            <span class="task-copy">
              <strong>我想查看历史任务和报告</strong>
              <small>回顾过去生成的分析产物，下载旧版本报告或对历史任务发起迭代分析。</small>
            </span>
            <span class="secondary-action">
              查看历史
              <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m12 3 8 4-8 4-8-4 8-4Z" />
                <path d="m4 12 8 4 8-4" />
                <path d="m4 17 8 4 8-4" />
              </svg>
            </span>
          </RouterLink>
        </div>

        <section class="path-section" aria-labelledby="path-title">
          <h2 id="path-title">推荐路径</h2>
          <div class="path-grid">
            <article class="path-card">
              <span>1.</span>
              <strong>创建任务</strong>
              <p>输入你关注的产品名称、官网地址或上传你现有的调研文件。</p>
            </article>
            <article class="path-card">
              <span>2.</span>
              <strong>确认名单</strong>
              <p>系统根据你的描述初步搜索并推荐竞品，你可以剔除无关项或补充新对手。</p>
            </article>
            <article class="path-card">
              <span>3.</span>
              <strong>等待生成</strong>
              <p>多Agent自动并行分析，完成后你将收到一键导出的深度报告。</p>
            </article>
          </div>
        </section>
      </section>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppShell from "@/components/AppShell.vue";
</script>

<style scoped>
.dashboard-home svg {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.content-panel {
  min-width: 0;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  gap: 26px;
}

.task-card {
  min-height: 250px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 22px;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  padding: 26px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  border-color: #bfcef5;
  box-shadow: 0 18px 36px rgba(38, 74, 124, 0.09);
}

.task-icon {
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 24px;
}

.task-icon.blue {
  color: #2563eb;
  background: #edf4ff;
}

.task-icon.purple {
  color: #9333ea;
  background: #faf0ff;
}

.task-icon.orange {
  color: #ea580c;
  background: #fff8e8;
}

.task-icon.green {
  color: #16a34a;
  background: #edfdf3;
}

.task-copy {
  display: grid;
  gap: 12px;
}

.task-copy strong {
  color: #1d293d;
  font-size: 20px;
  line-height: 1.35;
}

.task-copy small {
  color: #536b8b;
  font-size: 14px;
  line-height: 1.65;
}

.primary-action,
.secondary-action {
  min-height: 45px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: auto;
  border-radius: 8px;
  padding: 0 24px;
  font-size: 16px;
  font-weight: 800;
}

.primary-action {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
}

.secondary-action {
  border: 1px solid #dbe3ef;
  background: #ffffff;
  color: #26364d;
}

.action-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.path-section {
  margin-top: 36px;
}

.path-section h2 {
  margin: 0 0 18px;
  color: #172033;
  font-size: 22px;
  line-height: 1.2;
}

.path-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
}

.path-card {
  position: relative;
  min-height: 108px;
  border: 1px solid #d9e2ef;
  border-radius: 14px;
  padding: 26px 26px 20px;
  background: #ffffff;
}

.path-card span {
  position: absolute;
  top: 21px;
  left: 22px;
  color: #8da1ba;
  font-size: 28px;
  font-weight: 300;
}

.path-card strong {
  display: block;
  margin-left: 26px;
  color: #1d293d;
  font-size: 17px;
  letter-spacing: 0.18em;
}

.path-card p {
  margin: 14px 0 0;
  color: #536b8b;
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 1100px) {
  .task-grid,
  .path-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .task-grid {
    grid-template-columns: 1fr;
  }

  .task-card {
    min-height: 220px;
    padding: 22px;
  }
}
</style>
