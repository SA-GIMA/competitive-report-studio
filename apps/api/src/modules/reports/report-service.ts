import type { PipelineSnapshot, ReportArtifact } from "@studio/shared";

export class ReportService {
  private readonly reports = new Map<string, ReportArtifact>();
  private readonly snapshots = new Map<string, PipelineSnapshot>();

  save(report: ReportArtifact, snapshot?: PipelineSnapshot) {
    this.reports.set(report.reportId, report);
    if (snapshot) {
      this.snapshots.set(snapshot.taskId, snapshot);
    }
    return report;
  }

  get(reportId: string) {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`报告不存在: ${reportId}`);
    }
    return report;
  }

  getOptional(reportId: string) {
    return this.reports.get(reportId);
  }

  getSnapshot(taskId: string) {
    return this.snapshots.get(taskId);
  }

  getReportFile(reportId: string, kind: "final" | "editable") {
    const report = this.get(reportId);
    return kind === "final" ? report.finalDocxPath : report.editableDocxPath;
  }

  getChartFile(reportId: string, chartId: string) {
    const report = this.get(reportId);
    const chart = report.chartAssets.find((item) => item.id === chartId);
    if (!chart) {
      throw new Error(`图表不存在: ${chartId}`);
    }
    return chart.filePath;
  }
}
