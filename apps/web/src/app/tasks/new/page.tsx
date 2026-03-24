import { AppShell } from "../../../components/app-shell";
import { TaskConsole } from "../../../components/task-console";

export default function NewTaskPage() {
  return (
    <AppShell
      title="创建分析任务"
      subtitle="任务入口现在可以实际解析需求并调用后端运行 demo 流水线，已经不再是只读原型。"
    >
      <TaskConsole />
    </AppShell>
  );
}
