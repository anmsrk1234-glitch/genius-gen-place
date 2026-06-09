import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chatCompletion, getProviderApiKey, type ChatMessage } from "@/lib/ai-provider.server";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
] as const;

const inputSchema = z.object({
  systemPrompt: z.string().max(8000).optional().default(""),
  userPrompt: z.string().min(1).max(8000),
  runs: z.number().int().min(2).max(6),
  model: z.enum(MODELS).default("google/gemini-2.5-flash"),
  temperature: z.number().min(0).max(2).default(1),
});

export type ProbeRun = {
  index: number;
  output: string;
  ms: number;
  error?: string;
  finishReason?: string;
  truncated?: boolean;
  usage?: { input?: number; output?: number; total?: number };
  rawUsage?: any;
  rawResponse?: any;
};


export type ProbeResult = {
  runs: ProbeRun[];
  model: string;
  temperature: number;
};

export const runProbe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<ProbeResult> => {
    const apiKey = getProviderApiKey();

    const messages: ChatMessage[] = [];
    if (data.systemPrompt.trim()) messages.push({ role: "system", content: data.systemPrompt });
    messages.push({ role: "user", content: data.userPrompt });

    // Run in parallel — each call is independent and zero-cached server-side.
    // No auto-budgeting: rely on DEFAULT_MAX_TOKENS (1000) for reliable, complete outputs.
    const promises = Array.from({ length: data.runs }, (_, i) =>
      chatCompletion({
        model: data.model,
        temperature: data.temperature,
        messages,
        apiKey,
      }).then((r) => ({ index: i + 1, ...r })),
    );

    const runs = await Promise.all(promises);
    return { runs, model: data.model, temperature: data.temperature };
  });
