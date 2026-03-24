import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "总览" },
  { href: "/tasks/new", label: "新建任务" },
  { href: "/tasks", label: "任务历史" },
  { href: "/templates", label: "模板管理" },
  { href: "/settings", label: "模型设置" }
];

export function AppShell(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src="/china-mobile.svg" alt="中国移动" />
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
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
    </div>
  );
}
