import { AppShell } from "../../../components/app-shell";
import { SectionCard } from "../../../components/section-card";

export default function ReportPreviewPage() {
  return (
    <AppShell
      title="报告预览"
      subtitle="报告详情页应展示章节预览、图表资源、引用来源和生成记录，并支持局部重写、局部刷新与失败重试。"
    >
      <div className="panel-grid">
        <SectionCard title="生成记录" description="可追溯性是生产系统的基础能力。">
          <div className="list">
            <div className="list-item">
              <strong>使用模型</strong>
              <span className="muted">Planner / Extractor / Writer 三段路由</span>
            </div>
            <div className="list-item">
              <strong>使用模板</strong>
              <span className="muted">高层汇报版（中文）</span>
            </div>
            <div className="list-item">
              <strong>图表参数</strong>
              <span className="muted">主题 business_blue，统一 1200x720 输出</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="操作区" description="建议支持以下局部更新能力。">
          <div className="chip-row">
            <button className="button">只重写本章</button>
            <button className="button secondary">只刷新图表</button>
            <button className="button secondary">只更新竞品</button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="报告内容预览" description="正文、图表和参考来源应在同一页联动展示。">
        <div className="list">
          <div className="list-item">
            <strong>第一章 行业背景</strong>
            <p className="muted">
              中国 AI 办公助手赛道正在从通用问答快速转向企业流程嵌入与知识协作落地。
            </p>
          </div>
          <div className="list-item">
            <strong>第三章 核心功能对比</strong>
            <p className="muted">
              建议在此绑定柱状图、对比表格和四象限图，分别表现功能覆盖、产品定位与商业价值。
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
