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
          Authorization: `Bearer ${config.apiKeyRef}`
        },
        signal: AbortSignal.timeout(config.timeoutMs)
      });

      return {
        ok: response.ok,
        message: response.ok ? "连接成功" : `连接失败: ${response.status}`
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

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await fetch(
        `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKeyRef}`
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
                content: input.systemPrompt
              },
              {
                role: "user",
                content: input.userPrompt
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

const resolveRetryDelay = (attempt: number, retryAfterHeader: string | null) => {
  const retryAfterSeconds = Number(retryAfterHeader ?? "");
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  return 1500 * attempt;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
