const configuredApiBaseUrl = (
  ((globalThis as Record<string, unknown>).__STUDIO_API_BASE_URL__ as string | undefined) ??
  import.meta.env.VITE_API_BASE_URL
)?.replace(/\/$/, "");
const apiPort = import.meta.env.VITE_API_PORT ?? "4100";

export const getApiBaseUrl = () => {
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window !== "undefined") {
    const host = formatHost(window.location.hostname || "127.0.0.1");
    return `${window.location.protocol}//${host}:${apiPort}`;
  }

  return `http://127.0.0.1:${apiPort}`;
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

export const API_BASE_URL = getApiBaseUrl();
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const hasBody = init?.body !== undefined && init?.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (API_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${API_TOKEN}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(normalizeApiError(raw || `请求失败: ${response.status}`));
  }

  return response.json() as Promise<T>;
}

function normalizeApiError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      message?: string;
      error?: string;
    };
    const message = parsed.message ?? parsed.error ?? raw;
    if (message.includes("insufficient_balance") || message.includes("Insufficient account balance")) {
      return "模型供应商返回余额不足，请先充值或更换可用模型。";
    }
    return message;
  } catch {
    if (raw.includes("insufficient_balance") || raw.includes("Insufficient account balance")) {
      return "模型供应商返回余额不足，请先充值或更换可用模型。";
    }
    return raw;
  }
}

function formatHost(host: string) {
  if (host.includes(":") && !host.startsWith("[")) {
    return `[${host}]`;
  }
  return host;
}
