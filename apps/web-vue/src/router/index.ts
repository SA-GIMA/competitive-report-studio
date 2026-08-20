import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import DashboardView from "@/views/DashboardView.vue";
import CompetitiveReportOverviewView from "@/views/CompetitiveReportOverviewView.vue";
import FeatureListCreateView from "@/views/FeatureListCreateView.vue";
import FeatureListDetailView from "@/views/FeatureListDetailView.vue";
import FeatureListHistoryView from "@/views/FeatureListHistoryView.vue";
import FeatureListView from "@/views/FeatureListView.vue";
import GanttOverviewView from "@/views/GanttOverviewView.vue";
import GanttCreateView from "@/views/GanttCreateView.vue";
import GanttDetailView from "@/views/GanttDetailView.vue";
import GanttHistoryView from "@/views/GanttHistoryView.vue";
import ReportView from "@/views/ReportView.vue";
import SettingsView from "@/views/SettingsView.vue";
import TaskCreateView from "@/views/TaskCreateView.vue";
import TaskDetailView from "@/views/TaskDetailView.vue";
import TaskHistoryView from "@/views/TaskHistoryView.vue";
import TemplateView from "@/views/TemplateView.vue";

const router = createRouter({
  history:
    typeof window !== "undefined" && window.location.protocol === "file:"
      ? createWebHashHistory()
      : createWebHistory(),
  routes: [
    { path: "/", component: DashboardView },
    { path: "/competitive-report", component: CompetitiveReportOverviewView },
    { path: "/feature-list", component: FeatureListView },
    { path: "/feature-list/new", component: FeatureListCreateView },
    { path: "/feature-list/history", component: FeatureListHistoryView },
    { path: "/feature-list/history/:id", component: FeatureListDetailView },
    { path: "/settings", component: SettingsView },
    { path: "/tasks", component: TaskHistoryView },
    { path: "/tasks/new", component: TaskCreateView },
    { path: "/tasks/:id", component: TaskDetailView },
    { path: "/templates", component: TemplateView },
    { path: "/reports/:id", component: ReportView },
    { path: "/gantt", component: GanttOverviewView },
    { path: "/gantt/new", component: GanttCreateView },
    { path: "/gantt/history", component: GanttHistoryView },
    { path: "/gantt/history/:id", component: GanttDetailView }
  ]
});

export default router;
