import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5",
] as const;

const inputSchema = z.object({
  systemPrompt: z.string().max(8000).optional().default(""),
  userPrompt: z.string().min(1).max(8000),
  runs: z.number().int().min(2).max(10),
  model: z.enum(MODELS).default("google/gemini-2.5-flash"),
  temperature: z.number().min(0).max(2).default(1),
});

export type ProbeRun = {
  index: number;
  output: string;
  ms: number;
  error?: string;
};

export type ProbeResult = {
  runs: ProbeRun[];
  model: string;
  temperature: number;
};

async function callOnce(args: {
  model: string;
  temperature: number;
  systemPrompt: string;
  userPrompt: string;
  apiKey: string;
}): Promise<{ output: string; ms: number; error?: string }> {
  const start = Date.now();
  const messages: { role: string; content: string }[] = [];
  if (args.systemPrompt.trim()) messages.push({ role: "system", content: args.systemPrompt });
  messages.push({ role: "user", content: args.userPrompt });

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        messages,
        temperature: args.temperature,
      }),
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { output: "", ms, error: `${res.status}: ${text.slice(0, 200) || res.statusText}` };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const output = data.choices?.[0]?.message?.content ?? "";
    return { output, ms };
  } catch (e) {
    return { output: "", ms: Date.now() - start, error: (e as Error).message };
  }
}

export const runProbe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<ProbeResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    // Run in parallel — each call is independent and zero-cached server-side.
    const promises = Array.from({ length: data.runs }, (_, i) =>
      callOnce({
        model: data.model,
        temperature: data.temperature,
        systemPrompt: data.systemPrompt,
        userPrompt: data.userPrompt,
        apiKey,
      }).then((r) => ({ index: i + 1, ...r })),
    );

    const runs = await Promise.all(promises);
    return { runs, model: data.model, temperature: data.temperature };
  });
