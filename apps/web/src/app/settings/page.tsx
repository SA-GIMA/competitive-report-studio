import { AppShell } from "../../components/app-shell";
import { SettingsConsole } from "../../components/settings-console";

export default function SettingsPage() {
  return (
    <AppShell
      title="模型设置"
      subtitle="模型中心现在支持真实编辑、保存、健康检查和任务路由切换，不再只是只读说明页。"
    >
      <SettingsConsole />
    </AppShell>
  );
}
