import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { SectionCard } from "../components/section-card";

export default function DashboardPage() {
  return (
    <AppShell
      title="智能报告与规划工作台"
      subtitle="总览页现在聚合三个方向：智能竞品分析报告生成、智能功能清单生成、智能甘特图生成。当前竞品分析已经可实际运行，另外两条能力线先以建设中入口预留。"
    >
      <div className="hero-grid">
        <section className="hero-panel">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>三条能力线统一入口</p>
          <h2>把调研、清单整理和项目规划放进同一套智能工作台</h2>
          <p>
            竞品分析已经具备从中文检索到 Word 导出的完整闭环，功能清单和甘特图能力会沿用同一套模型配置、任务管理和产物输出体系继续扩展。
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/competitive-report">
              查看竞品分析能力
            </Link>
            <Link className="button ghost" href="/settings">
              统一配置模型
            </Link>
          </div>
        </section>

        <section className="hero-note">
          <strong>当前产品规划</strong>
          <ul>
            <li>智能竞品分析报告生成：已可运行，适合研究、汇报和策略判断。</li>
            <li>智能功能清单生成：规划中，后续用于把需求自动整理成结构化清单。</li>
            <li>智能甘特图生成：规划中，后续用于把方案和排期自动转成项目时间线。</li>
            <li>三条能力线共用模型中心、模板体系和任务化工作流。</li>
          </ul>
        </section>
      </div>

      <div className="highlight-grid">
        <article className="metric">
          <strong>3</strong>
          <span>规划中的智能方向</span>
        </article>
        <article className="metric">
          <strong>1</strong>
          <span>已经跑通的完整链路</span>
        </article>
        <article className="metric">
          <strong>100%</strong>
          <span>复用统一模型配置中心</span>
        </article>
      </div>

      <div className="panel-grid" style={{ marginTop: 18 }}>
        <SectionCard
          title="智能竞品分析报告生成"
          description="这是当前最成熟的一条线，已经支持需求解析、候选竞品确认、图表生成和 Word 导出。"
          action={
            <Link className="button" href="/competitive-report">
              进入能力总览
            </Link>
          }
        >
          <div className="chip-row">
            <span className="chip">需求解析</span>
            <span className="chip">候选竞品确认</span>
            <span className="chip">结构化抽取</span>
            <span className="chip">图表生成</span>
            <span className="chip">Word 导出</span>
          </div>
        </SectionCard>

        <SectionCard
          title="智能功能清单生成"
          description="后续会把原始需求自动拆解成模块、字段、优先级和验收视图，先保留独立入口。"
          action={
            <Link className="button secondary" href="/feature-list">
              查看建设中页面
            </Link>
          }
        >
          <div className="list">
            <div className="list-item">
              <strong>目标产物</strong>
              <span className="muted">结构化功能点、字段说明、依赖关系、优先级建议。</span>
            </div>
            <div className="list-item">
              <strong>预期复用</strong>
              <span className="muted">复用当前模型中心、任务页交互和文档导出机制。</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="智能甘特图生成"
          description="后续会把目标、里程碑和资源约束转成时间计划视图，也先保留独立入口。"
          action={
            <Link className="button secondary" href="/gantt">
              查看建设中页面
            </Link>
          }
        >
          <div className="list">
            <div className="list-item">
              <strong>目标产物</strong>
              <span className="muted">阶段计划、依赖路径、关键节点与项目时间线图。</span>
            </div>
            <div className="list-item">
              <strong>预期复用</strong>
              <span className="muted">复用统一模型配置、任务追踪与产物下载能力。</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
