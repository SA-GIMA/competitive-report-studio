import { join } from "node:path";
import { getAppConfig } from "@studio/config";
import type { PipelineSnapshot, ReportArtifact } from "@studio/shared";
import { ReportStateStore } from "./report-state-store.ts";

export class ReportService {
  private readonly reports = new Map<string, ReportArtifact>();
  private readonly snapshots = new Map<string, PipelineSnapshot>();
  private readonly store = new ReportStateStore(
    join(process.cwd(), getAppConfig().storage.appStateDir, "reports.json")
  );

  constructor() {
    const persisted = this.store.load();
    for (const report of persisted.reports) {
      this.reports.set(report.reportId, report);
    }
    for (const snapshot of persisted.snapshots) {
      this.snapshots.set(snapshot.taskId, snapshot);
    }
  }

  save(report: ReportArtifact, snapshot?: PipelineSnapshot) {
    this.reports.set(report.reportId, report);
    if (snapshot) {
      this.snapshots.set(snapshot.taskId, snapshot);
    }
    this.persist();
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

  getReportDownloadName(reportId: string, kind: "final" | "editable") {
    const report = this.get(reportId);
    if (kind === "final") {
      return report.finalFileName;
    }
    return report.editableFileName;
  }

  getChartFile(reportId: string, chartId: string) {
    const report = this.get(reportId);
    const chart = report.chartAssets.find((item) => item.id === chartId);
    if (!chart) {
      throw new Error(`图表不存在: ${chartId}`);
    }
    return chart.filePath;
  }

  private persist() {
    this.store.save({
      reports: Array.from(this.reports.values()),
      snapshots: Array.from(this.snapshots.values())
    });
  }
}
