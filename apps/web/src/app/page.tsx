import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { SectionCard } from "../components/section-card";

export default function DashboardPage() {
  return (
    <AppShell
      title="自动生成竞品分析报告"
      subtitle="从中文互联网检索、结构化抽取、图表生成到 Word 导出全部串成可追溯流水线，支持多模型、多模板和断点续跑。"
    >
      <section className="hero">
        <h2>产品目标</h2>
        <p>
          让运营、战略、投资、老板汇报团队只输入一句自然语言，就能自动得到一份图文并茂、带来源追溯的中文 Word
          竞品分析报告。
        </p>
        <ul>
          <li>支持自然语言解析行业、竞品类型、地域、时间和关注维度。</li>
          <li>支持候选竞品发现、确认、分层和 Top N 筛选。</li>
          <li>支持图表资源输出、Word 模板占位符替换和可编辑版导出。</li>
        </ul>
      </section>

      <div className="dashboard-grid">
        <article className="metric">
          <strong>6</strong>
          <span>核心后端模块</span>
        </article>
        <article className="metric">
          <strong>4</strong>
          <span>主要业务页面</span>
        </article>
        <article className="metric">
          <strong>100%</strong>
          <span>关键能力可配置</span>
        </article>
      </div>

      <div className="panel-grid" style={{ marginTop: 18 }}>
        <SectionCard
          title="标准流水线"
          description="任务创建后会依次完成需求解析、检索、竞品发现、抽取、图表生成、报告写作和 Word 导出。"
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
            <span className="chip">图表生成</span>
            <span className="chip">Word 导出</span>
          </div>
        </SectionCard>

        <SectionCard
          title="配置驱动架构"
          description="模型、模板、图表主题、章节结构、来源可信度策略都可以独立配置和扩展。"
          action={
            <Link className="button secondary" href="/settings">
              前往设置
            </Link>
          }
        >
          <div className="list">
            <div className="list-item">
              <strong>模型路由</strong>
              <span className="muted">不同任务可切换到不同 API 和模型。</span>
            </div>
            <div className="list-item">
              <strong>模板占位符</strong>
              <span className="muted">通过绑定路径把章节、图表和附录自动映射到 Word 模板。</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
