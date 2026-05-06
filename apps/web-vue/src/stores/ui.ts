import { defineStore } from "pinia";

const STORAGE_KEY = "competitive-report-studio.sidebar-width";

export const useUiStore = defineStore("ui", {
  state: () => ({
    sidebarWidth: 280
  }),
  actions: {
    hydrate() {
      if (typeof window === "undefined") {
        return;
      }
      const saved = Number(window.localStorage.getItem(STORAGE_KEY) ?? "");
      if (Number.isFinite(saved) && saved >= 220 && saved <= 420) {
        this.sidebarWidth = saved;
      }
    },
    setSidebarWidth(width: number) {
      this.sidebarWidth = Math.max(220, Math.min(420, width));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(this.sidebarWidth));
      }
    }
  }
});
