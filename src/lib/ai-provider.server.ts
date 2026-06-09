// Server-only AI provider abstraction.
// Currently targets AIcredits (OpenAI-compatible). Swap PROVIDER_CONFIG
// to migrate to any other OpenAI-compatible gateway with no call-site changes.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ProviderConfig = {
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  extraHeaders?: Record<string, string>;
};

const PROVIDER_CONFIG: ProviderConfig = {
  name: "aicredits",
  baseUrl: "https://api.aicredits.in/v1",
  apiKeyEnv: "AICREDITS_API_KEY",
};

// Default max output tokens. Tuned for reliability over cost: we'd rather pay
// for a complete answer than show users a truncated one.
export const DEFAULT_MAX_TOKENS = 1000;

export function getProviderApiKey(): string {
  const key = process.env[PROVIDER_CONFIG.apiKeyEnv];
  if (!key) {
    throw new Error(
      `${PROVIDER_CONFIG.apiKeyEnv} is not configured. Add it as a secret to enable AI requests.`,
    );
  }
  return key;
}

export type ChatCompletionInput = {
  model: string;
  temperature: number;
  messages: ChatMessage[];
  maxTokens?: number;
  apiKey: string;
};

export type TokenUsage = {
  input?: number;
  output?: number;
  total?: number;
};

export type ChatCompletionResult = {
  output: string;
  ms: number;
  error?: string;
  finishReason?: string;
  usage?: TokenUsage;
  truncated?: boolean;
  rawUsage?: any;
  rawResponse?: any;
};


export async function chatCompletion(input: ChatCompletionInput): Promise<ChatCompletionResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${PROVIDER_CONFIG.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        ...(PROVIDER_CONFIG.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    });
    const ms = Date.now() - start;
    const rawText = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[ai-provider] non-ok", res.status, rawText.slice(0, 1200));
      return { output: "", ms, error: friendlyError(res.status, rawText || res.statusText) };
    }
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[ai-provider] non-JSON response:", rawText.slice(0, 1200));
      return { output: "", ms, error: `Provider returned non-JSON: ${rawText.slice(0, 300)}` };
    }

    const finishReason: string | undefined = data?.choices?.[0]?.finish_reason;
    const usage = extractUsage(data);
    const truncated = finishReason === "length" || finishReason === "max_tokens";
    const output = extractOutput(data);

    if (output && output.trim()) {
      return { output, ms, finishReason, usage, truncated };
    }

    // Empty output — surface the real reason, never a generic "Empty response".
    console.error("[ai-provider] empty output. Full response:", JSON.stringify(data).slice(0, 2000));
    const providerErr =
      (typeof data?.error === "string" && data.error) ||
      data?.error?.message ||
      data?.message ||
      (truncated && "Response was truncated before any content was produced. Increase the token limit.") ||
      (finishReason && `Provider returned no content (finish_reason: ${finishReason}).`) ||
      `Provider returned no content. Raw: ${JSON.stringify(data).slice(0, 400)}`;
    return { output: "", ms, error: String(providerErr), finishReason, usage, truncated };
  } catch (e) {
    return {
      output: "",
      ms: Date.now() - start,
      error: `Network error: ${(e as Error).message}`,
    };
  }
}

function extractUsage(data: any): TokenUsage | undefined {
  const u = data?.usage;
  if (!u) return undefined;
  const input = u.prompt_tokens ?? u.input_tokens;
  const output = u.completion_tokens ?? u.output_tokens;
  const total = u.total_tokens ?? (typeof input === "number" && typeof output === "number" ? input + output : undefined);
  if (input == null && output == null && total == null) return undefined;
  return { input, output, total };
}

function extractOutput(data: any): string {
  if (!data) return "";
  const choice = data.choices?.[0];
  const msg = choice?.message;
  if (typeof msg?.content === "string" && msg.content) return msg.content;
  if (Array.isArray(msg?.content)) {
    const joined = msg.content
      .map((p: any) => (typeof p === "string" ? p : p?.text ?? p?.content ?? ""))
      .filter(Boolean)
      .join("");
    if (joined) return joined;
  }
  if (typeof msg?.reasoning_content === "string" && msg.reasoning_content) return msg.reasoning_content;
  if (typeof choice?.text === "string" && choice.text) return choice.text;
  const geminiText = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("");
  if (geminiText) return geminiText;
  if (msg?.tool_calls?.length) return JSON.stringify(msg.tool_calls);
  return "";
}

function friendlyError(status: number, body: string): string {
  if (status === 401 || status === 403) return "AI provider rejected the API key. Check your AICREDITS_API_KEY.";
  if (status === 402) return "AI credits exhausted. Top up your AIcredits account to continue.";
  if (status === 429) return "Rate limited by the AI provider. Please wait a moment and try again.";
  if (status >= 500) return "AI provider is temporarily unavailable. Please retry shortly.";
  const snippet = body.slice(0, 300);
  return `AI request failed (${status})${snippet ? `: ${snippet}` : ""}`;
}
