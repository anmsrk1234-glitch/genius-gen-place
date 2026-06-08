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

export type ChatCompletionResult = {
  output: string;
  ms: number;
  error?: string;
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
        max_tokens: input.maxTokens ?? 500,
      }),
    });
    const ms = Date.now() - start;
    const rawText = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[ai-provider] non-ok", res.status, rawText.slice(0, 800));
      return { output: "", ms, error: friendlyError(res.status, rawText || res.statusText) };
    }
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[ai-provider] non-JSON response:", rawText.slice(0, 800));
      return { output: "", ms, error: `Provider returned non-JSON: ${rawText.slice(0, 200)}` };
    }
    console.log("[ai-provider] response shape:", JSON.stringify(data).slice(0, 1200));

    const output = extractOutput(data);
    if (output && output.trim()) return { output, ms };

    const finish = data?.choices?.[0]?.finish_reason;
    const providerErr =
      (typeof data?.error === "string" && data.error) ||
      data?.error?.message ||
      data?.message ||
      (finish === "length" && "Response truncated (max_tokens reached). Try increasing max_tokens.") ||
      (finish && `Provider returned empty content (finish_reason: ${finish}).`) ||
      `Empty response. Raw: ${JSON.stringify(data).slice(0, 300)}`;
    return { output: "", ms, error: String(providerErr) };
  } catch (e) {
    return {
      output: "",
      ms: Date.now() - start,
      error: `Network error: ${(e as Error).message}`,
    };
  }
}

function extractOutput(data: any): string {
  if (!data) return "";
  const choice = data.choices?.[0];
  const msg = choice?.message;
  // Standard OpenAI shape
  if (typeof msg?.content === "string" && msg.content) return msg.content;
  // Array-of-parts shape (Anthropic/Gemini-style passthrough)
  if (Array.isArray(msg?.content)) {
    const joined = msg.content
      .map((p: any) => (typeof p === "string" ? p : p?.text ?? p?.content ?? ""))
      .filter(Boolean)
      .join("");
    if (joined) return joined;
  }
  // Reasoning models sometimes use reasoning_content
  if (typeof msg?.reasoning_content === "string" && msg.reasoning_content) return msg.reasoning_content;
  // Completions-style fallback
  if (typeof choice?.text === "string" && choice.text) return choice.text;
  // Gemini-passthrough shape
  const geminiText = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("");
  if (geminiText) return geminiText;
  // Tool calls only — surface a hint
  if (msg?.tool_calls?.length) return JSON.stringify(msg.tool_calls);
  return "";
}

function friendlyError(status: number, body: string): string {
  if (status === 401 || status === 403) return "AI provider rejected the API key. Check your AICREDITS_API_KEY.";
  if (status === 402) return "AI credits exhausted. Top up your AIcredits account to continue.";
  if (status === 429) return "Rate limited by the AI provider. Please wait a moment and try again.";
  if (status >= 500) return "AI provider is temporarily unavailable. Please retry shortly.";
  const snippet = body.slice(0, 200);
  return `AI request failed (${status})${snippet ? `: ${snippet}` : ""}`;
}
