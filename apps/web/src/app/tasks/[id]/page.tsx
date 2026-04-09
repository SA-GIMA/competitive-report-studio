import { AppShell } from "../../../components/app-shell";
import { TaskDetailConsole } from "../../../components/task-detail-console";

export default async function TaskDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <AppShell
      title="任务详情"
      subtitle="查看单个历史任务的解析结果、竞品、图表与报告产物。"
    >
      <TaskDetailConsole taskId={params.id} />
    </AppShell>
  );
}
