import type { TaskFailureCategory, TaskStatus } from "@studio/shared";

export const formatDateTime = (value?: string) => {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

export const formatBytes = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const truncate = (value: string, limit: number) =>
  value.length > limit ? `${value.slice(0, limit)}...` : value;

export const formatTaskStatus = (status: TaskStatus) => {
  switch (status) {
    case "draft":
      return "草稿";
    case "awaiting_confirmation":
      return "待确认";
    case "queued":
      return "排队中";
    case "running":
      return "运行中";
    case "paused":
      return "已暂停";
    case "failed":
      return "失败";
    case "completed":
      return "已完成";
  }
};

export const taskStatusClass = (status: TaskStatus) => {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "warning";
    default:
      return "";
  }
};

export const formatFailureCategory = (category?: TaskFailureCategory) => {
  switch (category) {
    case "configuration":
      return "配置问题";
    case "input":
      return "输入问题";
    case "temporary":
      return "临时故障";
    case "provider":
      return "供应商异常";
    case "unknown":
      return "未知故障";
    default:
      return "-";
  }
};
