import type { ModelConnectionConfig } from "@studio/shared";
import type { GenerateTextInput, LlmProvider } from "./types.ts";

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type: string; text?: string }>;
    };
  }>;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly providerName = "openai-compatible";

  async healthCheck(config: ModelConnectionConfig) {
    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resolveApiKey(config.apiKeyRef)}`
        },
        signal: AbortSignal.timeout(config.timeoutMs)
      });

      if (response.status === 404) {
        return this.fallbackChatCompletionHealthCheck(config);
      }

      return {
        ok: response.ok,
        message: response.ok
          ? "连接成功"
          : `连接失败: ${response.status}（/models 不可用）`
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  private async fallbackChatCompletionHealthCheck(config: ModelConnectionConfig) {
    try {
      const response = await fetch(
        `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resolveApiKey(config.apiKeyRef)}`
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0,
            max_tokens: 1,
            messages: [
              {
                role: "user",
                content: "ping"
              }
            ]
          }),
          signal: AbortSignal.timeout(config.timeoutMs)
        }
      );

      return {
        ok: response.ok,
        message: response.ok
          ? "连接成功（该端点未提供 /models，已通过 /chat/completions 校验）"
          : `连接失败: ${response.status}（/models 与 /chat/completions 都不可用或当前鉴权不兼容）`
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  async generateText(config: ModelConnectionConfig, input: GenerateTextInput) {
    const maxAttempts = 3;
    let lastRateLimitMessage = "";
    const systemPrompt = ensureJsonPromptCompatibility(input.systemPrompt, input.responseFormat);
    const userPrompt = ensureJsonPromptCompatibility(input.userPrompt, input.responseFormat);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await fetch(
        `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resolveApiKey(config.apiKeyRef)}`
          },
          body: JSON.stringify({
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.maxTokens ?? 2400,
            response_format:
              input.responseFormat === "json" ? { type: "json_object" } : undefined,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ]
          }),
          signal: AbortSignal.timeout(config.timeoutMs)
        }
      );

      if (!response.ok) {
        const body = await response.text();
        if (
          response.status === 402 ||
          body.includes("insufficient_balance") ||
          body.includes("Insufficient account balance")
        ) {
          throw new Error("模型供应商账户余额不足，请充值或更换可用的 API Key / 模型。");
        }

        if (
          response.status === 429 ||
          body.includes("RATE_LIMIT_ERROR") ||
          body.includes("rate limit")
        ) {
          lastRateLimitMessage = body;
          if (attempt < maxAttempts) {
            await sleep(resolveRetryDelay(attempt, response.headers.get("retry-after")));
            continue;
          }
          throw new Error(
            "模型供应商触发限流，请稍后重试，或降低分析数量 / 减少并发模型调用。"
          );
        }

        throw new Error(`LLM 调用失败: ${response.status} ${body}`);
      }

      const json = (await response.json()) as OpenAiChatCompletionResponse;
      const content = json.choices?.[0]?.message?.content;

      if (typeof content === "string") {
        return content;
      }

      if (Array.isArray(content)) {
        return content
          .filter((block) => block.type === "text" && block.text)
          .map((block) => block.text)
          .join("\n");
      }

      throw new Error("LLM 返回内容为空");
    }

    throw new Error(lastRateLimitMessage || "模型供应商触发限流，请稍后重试。");
  }
}

const ensureJsonPromptCompatibility = (
  prompt: string,
  responseFormat: GenerateTextInput["responseFormat"]
) => {
  if (responseFormat !== "json") {
    return prompt;
  }

  if (/\bjson\b/i.test(prompt)) {
    return prompt;
  }

  return `${prompt}\n\nReturn valid json only.`;
};

const resolveRetryDelay = (attempt: number, retryAfterHeader: string | null) => {
  const retryAfterSeconds = Number(retryAfterHeader ?? "");
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return 1500 * attempt;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveApiKey = (value: string) => {
  const matched = value.match(/^\$\{(.+)\}$/)?.[1];
  return matched ? process.env[matched] ?? value : value;
};
