import { AppShell } from "../../components/app-shell";
import { TaskHistoryConsole } from "../../components/task-history-console";

export default function TasksHistoryPage() {
  return (
    <AppShell
      title="任务历史"
      subtitle="查看已创建任务的状态、时间和详情入口，便于追踪历史生成记录。"
    >
      <TaskHistoryConsole />
    </AppShell>
  );
}
