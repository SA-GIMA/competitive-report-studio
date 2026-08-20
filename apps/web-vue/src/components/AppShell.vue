<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand-row">
        <button class="back-btn" type="button" @click.stop="goModeSelection" aria-label="返回">
          <svg class="back-icon" viewBox="0 0 1365 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
            <path d="M1346.349227 1024A641.706667 641.706667 0 0 0 743.04256 604.586667c-35.84-0.597333-68.266667 0-99.84 2.133333v241.066667a11.008 11.008 0 0 1-11.093333 10.581333 10.410667 10.410667 0 0 1-9.386667-5.12v1.024l-614.4-409.6h3.413333a10.666667 10.666667 0 0 1-5.12-20.224L622.72256 13.738667v1.024a10.410667 10.410667 0 0 1 9.386667-5.12 11.008 11.008 0 0 1 11.093333 10.581333 2.474667 2.474667 0 0 1-0.853333 2.218667v231.68c28.16-1.28 58.026667-1.706667 88.746666-1.194667A637.098667 637.098667 0 0 1 1365.975893 873.813333a584.106667 584.106667 0 0 1-19.626666 150.186667zM643.20256 0h-0.853333z m0 867.754667h-0.853333 0.853333z m0 0" fill="#1296db"></path>
          </svg>
        </button>
        <RouterLink class="brand" to="/">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8 8V6.5A2.5 2.5 0 0 1 10.5 4h3A2.5 2.5 0 0 1 16 6.5V8" />
              <path d="M5.5 8h13A1.5 1.5 0 0 1 20 9.5v8A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-8A1.5 1.5 0 0 1 5.5 8Z" />
              <path d="M9 13h6" />
              <path d="M12 10v6" />
            </svg>
          </span>
          <span>专业版<br/>产品设计智能体</span>
        </RouterLink>
      </div>

      <nav class="sidebar-nav" aria-label="主导航">
        <div class="nav-group">
          <p>核心功能</p>
          <RouterLink class="nav-row" :class="{ active: route.path === '/' }" to="/">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h7v7H4z" />
                <path d="M13 4h7v7h-7z" />
                <path d="M4 13h7v7H4z" />
                <path d="M13 13h7v7h-7z" />
              </svg>
            </span>
            <span>总览</span>
          </RouterLink>

          <div class="nav-section" :class="{ expanded: reportExpanded }">
            <div class="nav-row" :class="{ active: route.path === '/competitive-report' }" @click="toggleReport">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 3h7l4 4v14H7z" />
                  <path d="M14 3v5h5" />
                  <path d="M10 15h4" />
                  <path d="M10 18h6" />
                </svg>
              </span>
              <span>智能竞品分析报告</span>
              <span class="nav-caret" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
              </span>
            </div>
            <div v-if="reportExpanded" class="nav-children">
              <RouterLink class="nav-child" :class="{ active: route.path === '/competitive-report' }" to="/competitive-report">能力总览</RouterLink>
              <RouterLink class="nav-child" :class="{ active: route.path === '/tasks/new' }" to="/tasks/new">新建任务</RouterLink>
              <RouterLink class="nav-child" :class="{ active: route.path === '/templates' }" to="/templates">模板管理</RouterLink>
              <RouterLink
                class="nav-child"
                :class="{ active: route.path === '/tasks' || (route.path.startsWith('/tasks/') && !route.path.startsWith('/tasks/new')) }"
                to="/tasks"
              >
                任务历史
              </RouterLink>
            </div>
          </div>

          <div class="nav-section" :class="{ expanded: ganttExpanded }">
            <div class="nav-row" :class="{ active: route.path === '/gantt' }" @click="toggleGantt">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 6h10" />
                  <path d="M5 12h14" />
                  <path d="M5 18h7" />
                </svg>
              </span>
              <span>智能甘特图</span>
              <span class="nav-caret" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
              </span>
            </div>
            <div v-if="ganttExpanded" class="nav-children">
              <RouterLink class="nav-child" :class="{ active: route.path === '/gantt' }" to="/gantt">能力总览</RouterLink>
              <RouterLink class="nav-child" :class="{ active: route.path === '/gantt/new' }" to="/gantt/new">新建任务</RouterLink>
              <RouterLink
                class="nav-child"
                :class="{ active: route.path === '/gantt/history' || route.path.startsWith('/gantt/history/') }"
                to="/gantt/history"
              >
                任务历史
              </RouterLink>
            </div>
          </div>

          <div class="nav-section" :class="{ expanded: featureExpanded }">
            <div class="nav-row" :class="{ active: route.path === '/feature-list' }" @click="toggleFeature">
              <span class="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 7h.01" />
                  <path d="M7 12h.01" />
                  <path d="M7 17h.01" />
                  <path d="M11 7h7" />
                  <path d="M11 12h7" />
                  <path d="M11 17h7" />
                </svg>
              </span>
              <span>智能功能清单</span>
              <span class="nav-caret" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
              </span>
            </div>
            <div v-if="featureExpanded" class="nav-children">
              <RouterLink class="nav-child" :class="{ active: route.path === '/feature-list' }" to="/feature-list">能力总览</RouterLink>
              <RouterLink class="nav-child" :class="{ active: route.path === '/feature-list/new' }" to="/feature-list/new">新建清单</RouterLink>
              <RouterLink
                class="nav-child"
                :class="{ active: route.path === '/feature-list/history' || route.path.startsWith('/feature-list/history/') }"
                to="/feature-list/history"
              >
                历史清单
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="nav-group system-group">
          <p>系统管理</p>
          <RouterLink class="nav-row" :class="{ active: route.path === '/settings' }" to="/settings">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                <path d="M19.5 12a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.1-1.2L14.5 3h-5l-.4 2.7A8 8 0 0 0 7 6.9l-2.4-1-2 3.4 2 1.5A7.6 7.6 0 0 0 4.5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.1 1.2l.4 2.7h5l.4-2.7a8 8 0 0 0 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
              </svg>
            </span>
            <span>系统设置</span>
          </RouterLink>
        </div>
      </nav>

      <RouterLink class="user-card" to="/settings">
        <span class="avatar" aria-hidden="true">鲁</span>
        <span class="user-copy">
          <strong>鲁小移</strong>
          <small>政企产品研发</small>
        </span>
        <span class="user-arrow" aria-hidden="true">›</span>
      </RouterLink>
    </aside>

    <main class="shell-main">
      <header class="topbar">
        <div>
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="topbar-actions">
          <div class="date-pill">
            <span aria-hidden="true"></span>
            系统日期：{{ systemDate }}
          </div>
        </div>
      </header>
      <section class="shell-content">
        <slot />
      </section>
    </main>

    <div class="scroll-buttons">
      <button class="scroll-btn" aria-label="回到顶部" @click="scrollToTop">
        <svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6" /></svg>
      </button>
      <button class="scroll-btn" aria-label="去到底部" @click="scrollToBottom">
        <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineProps<{
  title: string;
  subtitle: string;
}>();

const route = useRoute();

const isReportChild = computed(
  () =>
    route.path.startsWith("/competitive-report") ||
    route.path.startsWith("/tasks") ||
    route.path.startsWith("/templates") ||
    route.path.startsWith("/reports")
);

const isGanttChild = computed(() => route.path.startsWith("/gantt"));
const isFeatureChild = computed(() => route.path.startsWith("/feature-list"));

const reportExpanded = ref(isReportChild.value && route.path !== "/");
const ganttExpanded = ref(isGanttChild.value && route.path !== "/");
const featureExpanded = ref(isFeatureChild.value && route.path !== "/");

watch(
  () => route.path,
  (path) => {
    if (path === "/") {
      reportExpanded.value = false;
      ganttExpanded.value = false;
    } else {
      if (isReportChild.value) reportExpanded.value = true;
      if (isGanttChild.value) ganttExpanded.value = true;
      if (isFeatureChild.value) featureExpanded.value = true;
    }
  }
);

function toggleReport() {
  reportExpanded.value = !reportExpanded.value;
}

function toggleGantt() {
  ganttExpanded.value = !ganttExpanded.value;
}

function toggleFeature() {
  featureExpanded.value = !featureExpanded.value;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToBottom() {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
}

const modeSelectUrl = computed(() => `http://${window.location.hostname}:5176/mode-select`);

function goModeSelection() {
  window.location.href = modeSelectUrl.value;
}

const systemDate = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}年${month}月${day}日`;
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr);
  background: #f1f5fb;
  color: #1d293d;
  letter-spacing: 0;
}

.app-shell svg {
  width: 1em;
  height: 1em;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-right: 1px solid #dce4ef;
  background: #ffffff;
  z-index: 3;
}

.brand-row {
  height: 92px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 26px;
}

.back-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1296db;
  cursor: pointer;
  transition: background 0.15s ease;
}

.back-btn:hover {
  background: #eef7fd;
}

.back-icon {
  width: 22px;
  height: 18px;
  fill: #1296db;
  stroke: none;
}

.back-icon path {
  stroke: none;
}

.brand {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #2563eb;
  font-size: 18px;
  font-weight: 800;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #2f6df6;
  color: #ffffff;
  font-size: 19px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
  padding: 0 17px 24px;
}

.nav-group {
  display: grid;
  gap: 8px;
}

.nav-group p {
  margin: 8px 0 0;
  color: #8b9ab0;
  font-size: 14px;
  font-weight: 800;
}

.nav-row {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 8px;
  padding: 0 10px;
  color: #32435a;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}

.nav-section {
  display: grid;
  gap: 2px;
}

.nav-row:hover,
.nav-child:hover {
  background: #f6f8fc;
  color: #2563eb;
}

.nav-row.active {
  position: relative;
  background: #f2f6ff;
  color: #2563eb;
}

.nav-row.active::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  border-radius: 999px;
  background: #2563eb;
}

.nav-icon {
  width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  color: currentColor;
  font-size: 18px;
  flex: 0 0 auto;
}

.nav-caret {
  margin-left: auto;
  display: inline-grid;
  place-items: center;
  color: #51627a;
  font-size: 16px;
  transition: transform 0.16s ease;
}

.nav-section.expanded .nav-caret {
  transform: rotate(180deg);
}

.nav-children {
  position: relative;
  display: grid;
  gap: 2px;
  padding: 2px 0 4px;
}

.nav-children::before {
  content: "";
  position: absolute;
  left: 20px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: #e5ebf3;
}

.nav-child {
  position: relative;
  min-height: 42px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding-left: 42px;
  color: #62738c;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.16s ease, color 0.16s ease;
}

.nav-child.active {
  background: #f2f6ff;
  color: #2563eb;
  font-weight: 800;
}

.nav-child.active::after {
  content: "";
  position: absolute;
  top: 7px;
  right: 0;
  bottom: 7px;
  width: 3px;
  border-radius: 999px;
  background: #2563eb;
}

.system-group {
  margin-top: 18px;
}

.user-card {
  min-height: 94px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #e5ebf3;
  padding: 18px 26px;
}

.avatar {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #0f172a, #64748b);
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
}

.avatar::after {
  content: "";
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #22c55e;
}

.user-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.user-copy strong {
  color: #304259;
  font-size: 14px;
}

.user-copy small {
  color: #75869f;
  font-size: 12px;
}

.user-arrow {
  color: #93a3b8;
  font-size: 22px;
}

.shell-main {
  min-width: 0;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.topbar {
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid #dce4ef;
  padding: 22px 34px 18px;
  background: #ffffff;
}

.topbar h1 {
  margin: 0;
  color: #172033;
  font-size: 22px;
  line-height: 1.2;
}

.topbar p {
  margin: 10px 0 0;
  color: #53657f;
  font-size: 13px;
  line-height: 1.45;
}

.topbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
}

.date-pill {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  padding: 0 18px;
  background: #f0f4f9;
  color: #33435a;
  font-size: 14px;
  font-weight: 600;
}

.date-pill span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #43d392;
}

.scroll-buttons {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 50;
}

.scroll-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid #dce4ef;
  border-radius: 10px;
  background: #ffffff;
  color: #32435a;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.scroll-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.scroll-btn:hover {
  background: #f2f6ff;
  color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
}

.shell-content {
  min-width: 0;
  padding: 26px 22px 42px;
}

@media (max-width: 980px) {
  .app-shell {
    display: block;
  }

  .app-sidebar {
    position: static;
    height: auto;
  }

  .user-card {
    display: none;
  }

  .topbar {
    display: grid;
    min-height: auto;
    padding: 22px;
  }

  .topbar-actions {
    justify-content: flex-start;
  }

  .shell-content {
    padding: 22px;
  }
}
</style>
