import { AppShell } from "../../../components/app-shell";
import { GanttConsole } from "../../../components/gantt-console";

export default function GanttNewPage() {
  return (
    <AppShell
      title="创建甘特图任务"
      subtitle="输入项目目标和时间约束，系统会自动拆解任务并生成可编辑的甘特图计划。"
    >
      <GanttConsole />
    </AppShell>
  );
}
