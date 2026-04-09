import { AppShell } from "../../components/app-shell";
import { SectionCard } from "../../components/section-card";
import Link from "next/link";

export default function FeatureListPage() {
  return (
    <AppShell
      title="智能功能清单生成总览"
      subtitle="这一条能力线正在建设中，后续会用于把自然语言需求整理成结构化功能清单，并复用当前系统的模型中心、任务流和产物导出能力。"
    >
      <div className="hero-grid">
        <section className="hero-panel">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>规划中的第二条能力线</p>
          <h2>把自然语言需求自动拆成结构化功能清单</h2>
          <p>
            后续会支持从业务目标出发，自动整理模块、字段、优先级、依赖关系与验收建议，适合作为产品需求梳理的起点。
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/settings">
              先配置模型
            </Link>
          </div>
        </section>
        <section className="hero-note">
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
        <div className="empty">
          智能功能清单生成正在建设中，当前先保留总览页，方便对外展示统一产品规划。
        </div>
      </SectionCard>
    </AppShell>
  );
}
