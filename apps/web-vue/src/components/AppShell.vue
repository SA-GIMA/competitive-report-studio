<template>
  <div class="shell" :style="{ gridTemplateColumns: `${ui.sidebarWidth}px 1fr` }">
    <aside class="sidebar">
      <nav class="nav">
        <div v-for="section in navSections" :key="section.title" class="nav-section">
          <button
            type="button"
            class="nav-section-trigger"
            :class="{ active: isSectionActive(section) }"
            @click="toggleSection(section.title)"
          >
            <span class="nav-section-title">{{ section.title }}</span>
            <span class="nav-section-arrow">{{ expandedSections.has(section.title) ? "−" : "+" }}</span>
          </button>
          <div v-if="expandedSections.has(section.title)" class="nav-links">
            <RouterLink
              v-for="item in section.items"
              :key="item.href"
              :to="item.href"
              class="nav-item child"
              :class="{ active: isActive(item.href) }"
            >
              {{ item.label }}
            </RouterLink>
          </div>
        </div>
      </nav>
      <button
        type="button"
        class="sidebar-resizer"
        aria-label="调整侧边栏宽度"
        @pointerdown="startResize"
      />
    </aside>
    <main class="main">
      <header class="page-header">
        <div>
          <p class="eyebrow">专业模式：任务编排智能体</p>
          <h1>{{ title }}</h1>
          <p class="subtitle">{{ subtitle }}</p>
        </div>
      </header>
      <slot />
    </main>
    <div class="floating-actions">
      <button type="button" class="glass-btn" title="回到顶部" @click="scrollToTop">
        ↑
      </button>
      <button type="button" class="glass-btn" title="到达底部" @click="scrollToBottom">
        ↓
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useUiStore } from "@/stores/ui";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

defineProps<{
  title: string;
  subtitle: string;
}>();

const route = useRoute();
const ui = useUiStore();
const expandedSections = ref(new Set<string>());
const dragState = {
  dragging: false,
  startX: 0,
  startWidth: 280
};

const navSections: NavSection[] = [
  { title: "总览", items: [{ href: "/", label: "总览" }] },
  {
    title: "智能竞品分析报告",
    items: [
      { href: "/competitive-report", label: "能力总览" },
      { href: "/tasks/new", label: "新建任务" },
      { href: "/templates", label: "模板管理" },
      { href: "/tasks", label: "任务历史" }
    ]
  },
  {
    title: "智能功能清单",
    items: [{ href: "/feature-list", label: "建设中" }]
  },
  {
    title: "智能甘特图",
    items: [
      { href: "/gantt", label: "能力总览" },
      { href: "/gantt/new", label: "新建任务" },
      { href: "/gantt/history", label: "任务历史" }
    ]
  },
  {
    title: "设置",
    items: [{ href: "/settings", label: "设置" }]
  }
];

const activeSectionTitle = computed(() => {
  const matched = navSections.find((section) =>
    section.items.some((item) => route.path === item.href || route.path.startsWith(`${item.href}/`))
  );
  return matched?.title ?? "总览";
});

const isActive = (href: string) => route.path === href;

const isSectionActive = (section: NavSection) => section.title === activeSectionTitle.value;

const syncExpandedSections = () => {
  expandedSections.value = new Set([activeSectionTitle.value]);
};

const toggleSection = (title: string) => {
  if (title === activeSectionTitle.value) {
    expandedSections.value = new Set([title]);
    return;
  }
  expandedSections.value = expandedSections.value.has(title)
    ? new Set([activeSectionTitle.value])
    : new Set([activeSectionTitle.value, title]);
};

const handleMove = (event: PointerEvent) => {
  if (!dragState.dragging) {
    return;
  }
  ui.setSidebarWidth(dragState.startWidth + event.clientX - dragState.startX);
};

const handleUp = () => {
  dragState.dragging = false;
};

const startResize = (event: PointerEvent) => {
  dragState.dragging = true;
  dragState.startX = event.clientX;
  dragState.startWidth = ui.sidebarWidth;
};

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

const scrollToBottom = () =>
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });

onMounted(() => {
  ui.hydrate();
  syncExpandedSections();
  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
});

watch(
  () => route.path,
  () => {
    syncExpandedSections();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", handleMove);
  window.removeEventListener("pointerup", handleUp);
});
</script>
