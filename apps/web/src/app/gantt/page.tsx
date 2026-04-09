import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { SectionCard } from "../../components/section-card";

export default function GanttOverviewPage() {
  return (
    <AppShell
      title="智能甘特图总览"
      subtitle="把项目目标、开始时间、截止时间和工期约束自动整理成项目时间计划，并生成可编辑的甘特图。"
    >
      <div className="hero-grid">
        <section className="hero-panel">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.72)" }}>独立项目规划能力</p>
          <h2>把目标、阶段、依赖和里程碑自动整理成项目甘特图</h2>
          <p>
            适用于产品发布、项目启动、交付执行、活动筹备和方案落地等场景。系统会调用模型拆解任务，再结合时间约束生成可编辑的时间计划。
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/gantt/new">
              新建任务
            </Link>
            <Link className="button ghost" href="/gantt/history">
              查看历史
            </Link>
          </div>
        </section>
        <section className="hero-note">
          <strong>当前支持</strong>
          <ul>
            <li>开始时间或截止时间约束</li>
            <li>正排 / 倒排</li>
            <li>双休 / 单休 / 自然日</li>
            <li>任务表与甘特图联动</li>
          </ul>
        </section>
      </div>

      <div className="two-col">
        <SectionCard title="使用路径" description="建议先生成，再微调，最后导出或汇报。">
          <div className="list">
            <div className="list-item">
              <strong>第一步</strong>
              <span className="muted">输入项目名称、目标、工期、开始时间或截止时间</span>
            </div>
            <div className="list-item">
              <strong>第二步</strong>
              <span className="muted">系统自动拆分阶段、任务、里程碑和风险提示</span>
            </div>
            <div className="list-item">
              <strong>第三步</strong>
              <span className="muted">在表格里继续调整任务名、起止时间和工期</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="适用场景" description="不是单一行业功能，而是通用项目时间计划能力。">
          <div className="list">
            <div className="list-item">
              <strong>产品类</strong>
              <span className="muted">版本发布、上线计划、评审节奏</span>
            </div>
            <div className="list-item">
              <strong>交付类</strong>
              <span className="muted">客户项目、实施排期、验收收口</span>
            </div>
            <div className="list-item">
              <strong>运营类</strong>
              <span className="muted">活动筹备、内容制作、联合执行</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
