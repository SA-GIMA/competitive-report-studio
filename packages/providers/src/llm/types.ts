import type { ModelConnectionConfig } from "@studio/shared";

export interface GenerateTextInput {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "text" | "json";
}

export interface LlmProvider {
  readonly providerName: string;
  healthCheck(config: ModelConnectionConfig): Promise<{ ok: boolean; message: string }>;
  generateText(config: ModelConnectionConfig, input: GenerateTextInput): Promise<string>;
}
