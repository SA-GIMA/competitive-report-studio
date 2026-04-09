import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { SectionCard } from "../../components/section-card";

export default function CompetitiveReportOverviewPage() {
  return (
    <AppShell
      title="智能竞品分析报告生成总览"
      subtitle="把中文互联网检索、结构化抽取、图表生成与 Word 汇报串成一条可追溯流水线，支持多模型、多模板和断点续跑。"
    >
      <div className="hero-grid">
        <section className="hero-panel">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>竞品分析自动化工作台</p>
          <h2>把中文互联网检索、图表生成与 Word 汇报串成一条可追溯流水线</h2>
          <p>
            面向老板汇报、行业研究、策略分析等高频场景，支持多模型路由、检索模式切换、模板管理、后台异步执行与进度跟踪。
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/tasks/new">
              立即创建任务
            </Link>
            <Link className="button ghost" href="/settings">
              配置模型与检索
            </Link>
          </div>
        </section>

        <section className="hero-note">
          <strong>领导视角下通常会关注什么</strong>
          <ul>
            <li>信息是否来自可信来源，是否能追溯。</li>
            <li>图表是否清晰，能否一眼看出差异和结论。</li>
            <li>汇报结构是否适合管理层阅读，而不是技术文档堆砌。</li>
            <li>生成过程是否稳定，失败后是否能快速定位与重试。</li>
          </ul>
        </section>
      </div>

      <div className="highlight-grid">
        <article className="metric">
          <strong>4</strong>
          <span>可切换检索模式</span>
        </article>
        <article className="metric">
          <strong>11</strong>
          <span>默认深度章节模版</span>
        </article>
        <article className="metric">
          <strong>100%</strong>
          <span>模型与模板可配置</span>
        </article>
      </div>

      <div className="panel-grid" style={{ marginTop: 18 }}>
        <SectionCard
          title="分阶段执行"
          description="任务已经改成后台分阶段执行，页面可以看到当前步骤和进度，不再让浏览器一直阻塞等待。"
          action={
            <Link className="button" href="/tasks/new">
              创建任务
            </Link>
          }
        >
          <div className="chip-row">
            <span className="chip">规划模型</span>
            <span className="chip">中文检索</span>
            <span className="chip">信息抽取</span>
            <span className="chip">图表专用检索</span>
            <span className="chip">图表生成</span>
            <span className="chip">Word 导出</span>
          </div>
        </SectionCard>

        <SectionCard
          title="配置驱动架构"
          description="模型预设、任务路由、SerpAPI、Skill Bridge、模板结构和图表逻辑都能独立配置。"
          action={
            <Link className="button secondary" href="/settings">
              前往设置
            </Link>
          }
        >
          <div className="list">
            <div className="list-item">
              <strong>模型路由</strong>
              <span className="muted">规划、抽取、写作可绑定不同模型，适合控制成本和风格。</span>
            </div>
            <div className="list-item">
              <strong>检索模式</strong>
              <span className="muted">支持 Mock、Search API、SerpAPI(Baidu)、Skill Bridge 和 Hybrid。</span>
            </div>
            <div className="list-item">
              <strong>模板与导出</strong>
              <span className="muted">通过模板占位符把章节、图表和附录自动映射到 Word 报告。</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
