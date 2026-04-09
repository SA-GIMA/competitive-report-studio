"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "总览",
    items: [{ href: "/", label: "总览" }]
  },
  {
    title: "智能竞品分析报告",
    items: [
      { href: "/competitive-report", label: "智能竞品分析报告总览" },
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
      { href: "/gantt", label: "智能甘特图总览" },
      { href: "/gantt/new", label: "新建任务" },
      { href: "/gantt/history", label: "任务历史" }
    ]
  },
  {
    title: "模型设置",
    items: [{ href: "/settings", label: "模型设置" }]
  }
];

export function AppShell(props: { title: string; subtitle: string; children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("competitive-report-studio.sidebar-width");
    const parsed = Number(saved ?? "");
    if (Number.isFinite(parsed) && parsed >= 220 && parsed <= 420) {
      setSidebarWidth(parsed);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "competitive-report-studio.sidebar-width",
      String(sidebarWidth)
    );
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const state = dragState.current;
      if (!state?.dragging) {
        return;
      }
      const nextWidth = Math.max(220, Math.min(420, state.startWidth + event.clientX - state.startX));
      setSidebarWidth(nextWidth);
    };

    const handleUp = () => {
      if (dragState.current) {
        dragState.current.dragging = false;
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragState.current = {
      dragging: true,
      startX: event.clientX,
      startWidth: sidebarWidth
    };
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  return (
    <div className="shell" style={{ gridTemplateColumns: `${sidebarWidth}px 1fr` }}>
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/china-mobile.svg" alt="中国移动" />
        </div>
        <nav className="nav">
          {navSections.map((section) => (
            <div key={section.title} className="nav-section">
              <div className="nav-section-title">{section.title}</div>
              <div className="nav-links">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item child ${isActive ? "active" : ""}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <button
          type="button"
          className="sidebar-resizer"
          aria-label="调整侧边栏宽度"
          onPointerDown={startResize}
        />
      </aside>
      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">企业级自动化流水线</p>
            <h1>{props.title}</h1>
            <p className="subtitle">{props.subtitle}</p>
          </div>
          <div className="header-badge">中文场景优先</div>
        </header>
        {props.children}
      </main>
      <div className="floating-actions">
        <button type="button" className="developer-badge action-badge" onClick={scrollToTop} aria-label="回到顶部">
          ↑
        </button>
        <button type="button" className="developer-badge action-badge" onClick={scrollToBottom} aria-label="到达底部">
          ↓
        </button>
        <div className="developer-badge">开发者：商建航</div>
      </div>
    </div>
  );
}
