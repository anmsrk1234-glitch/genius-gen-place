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
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        output: "",
        ms,
        error: friendlyError(res.status, text || res.statusText),
      };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const output = data.choices?.[0]?.message?.content ?? "";
    return { output, ms };
  } catch (e) {
    return {
      output: "",
      ms: Date.now() - start,
      error: `Network error: ${(e as Error).message}`,
    };
  }
}

function friendlyError(status: number, body: string): string {
  if (status === 401 || status === 403) return "AI provider rejected the API key. Check your AICREDITS_API_KEY.";
  if (status === 402) return "AI credits exhausted. Top up your AIcredits account to continue.";
  if (status === 429) return "Rate limited by the AI provider. Please wait a moment and try again.";
  if (status >= 500) return "AI provider is temporarily unavailable. Please retry shortly.";
  const snippet = body.slice(0, 200);
  return `AI request failed (${status})${snippet ? `: ${snippet}` : ""}`;
}
