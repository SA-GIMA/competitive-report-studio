import { AppShell } from "../../components/app-shell";
import { TemplateConsole } from "../../components/template-console";

export default function TemplatesPage() {
  return (
    <AppShell
      title="模板管理"
      subtitle="模板中心现在支持上传 .docx、编辑章节结构、调整顺序和保存配置，后续可以继续接入真实占位符解析。"
    >
      <TemplateConsole />
    </AppShell>
  );
}
