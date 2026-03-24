export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4100";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const headers = new Headers(init?.headers ?? {});

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(normalizeApiError(text || `请求失败: ${response.status}`));
  }

  return response.json() as Promise<T>;
}

const normalizeApiError = (raw: string) => {
  try {
    const parsed = JSON.parse(raw) as {
      message?: string;
      error?: string;
      code?: string;
    };
    const message = parsed.message ?? parsed.error ?? raw;
    if (message.includes("insufficient_balance") || message.includes("Insufficient account balance")) {
      return "模型供应商返回余额不足，请先到对应平台充值或更换可用模型/API Key。";
    }
    return message;
  } catch {
    if (raw.includes("insufficient_balance") || raw.includes("Insufficient account balance")) {
      return "模型供应商返回余额不足，请先到对应平台充值或更换可用模型/API Key。";
    }
    return raw;
  }
};
