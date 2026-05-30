import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EVENT_NAMES = [
  "page_view",
  "prompt_test_started",
  "prompt_test_completed",
  "model_selected",
  "run_count_changed",
] as const;

const eventSchema = z.object({
  event_name: z.enum(EVENT_NAMES),
  model: z.string().max(120).optional().nullable(),
  run_count: z.number().int().min(0).max(100).optional().nullable(),
  reliability_score: z.number().int().min(0).max(100).optional().nullable(),
  prompt_length: z.number().int().min(0).max(100000).optional().nullable(),
  path: z.string().max(500).optional().nullable(),
  session_id: z.string().max(80).optional().nullable(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => eventSchema.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("analytics_events").insert({
      event_name: data.event_name,
      model: data.model ?? null,
      run_count: data.run_count ?? null,
      reliability_score: data.reliability_score ?? null,
      prompt_length: data.prompt_length ?? null,
      path: data.path ?? null,
      session_id: data.session_id ?? null,
    });
    if (error) {
      console.error("[analytics] insert failed:", error.message);
      return { ok: false };
    }
    return { ok: true };
  });

const statsInput = z.object({ key: z.string().min(1).max(200) });

export type AnalyticsStats = {
  totalVisitors: number;
  totalPageViews: number;
  totalTestsStarted: number;
  totalTestsCompleted: number;
  completionRate: number;
  avgRunCount: number;
  avgReliabilityScore: number | null;
  modelUsage: { model: string; count: number }[];
  recentEvents: {
    created_at: string;
    event_name: string;
    model: string | null;
    run_count: number | null;
    reliability_score: number | null;
  }[];
};

export const getAnalyticsStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => statsInput.parse(d))
  .handler(async ({ data }): Promise<AnalyticsStats> => {
    const expected = process.env.ADMIN_ANALYTICS_KEY;
    if (!expected) throw new Error("ADMIN_ANALYTICS_KEY not configured.");
    if (data.key !== expected) throw new Error("Unauthorized");

    const { data: rows, error } = await supabaseAdmin
      .from("analytics_events")
      .select("event_name, model, run_count, reliability_score, session_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) throw new Error(error.message);
    const events = rows ?? [];

    const sessions = new Set<string>();
    let pageViews = 0;
    let started = 0;
    let completed = 0;
    let runCountSum = 0;
    let runCountN = 0;
    let scoreSum = 0;
    let scoreN = 0;
    const modelCounts = new Map<string, number>();

    for (const e of events) {
      if (e.session_id) sessions.add(e.session_id);
      if (e.event_name === "page_view") pageViews++;
      if (e.event_name === "prompt_test_started") {
        started++;
        if (typeof e.run_count === "number") {
          runCountSum += e.run_count;
          runCountN++;
        }
        if (e.model) modelCounts.set(e.model, (modelCounts.get(e.model) ?? 0) + 1);
      }
      if (e.event_name === "prompt_test_completed") {
        completed++;
        if (typeof e.reliability_score === "number") {
          scoreSum += e.reliability_score;
          scoreN++;
        }
      }
    }

    return {
      totalVisitors: sessions.size,
      totalPageViews: pageViews,
      totalTestsStarted: started,
      totalTestsCompleted: completed,
      completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
      avgRunCount: runCountN > 0 ? Math.round((runCountSum / runCountN) * 10) / 10 : 0,
      avgReliabilityScore: scoreN > 0 ? Math.round(scoreSum / scoreN) : null,
      modelUsage: [...modelCounts.entries()]
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count),
      recentEvents: events.slice(0, 50).map((e) => ({
        created_at: e.created_at as string,
        event_name: e.event_name as string,
        model: (e.model as string | null) ?? null,
        run_count: (e.run_count as number | null) ?? null,
        reliability_score: (e.reliability_score as number | null) ?? null,
      })),
    };
  });
