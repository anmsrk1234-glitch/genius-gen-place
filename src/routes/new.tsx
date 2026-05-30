import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Play, Sparkles, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { runProbe } from "@/lib/api/probe.functions";
import { track } from "@/lib/analytics";
import {
  EXAMPLES,
  MODEL_OPTIONS,
  reliabilityScore,
  saveTest,
  titleFromPrompt,
} from "@/lib/probe-utils";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "Test a Prompt — PromptProbe" },
      { name: "description", content: "Run your prompt N times to measure output drift and reliability." },
    ],
  }),
  component: NewTest,
});

function NewTest() {
  const navigate = useNavigate();
  const probe = useServerFn(runProbe);

  const [system, setSystem] = useState("");
  const [user, setUser] = useState("");
  const [runs, setRuns] = useState(3);
  const [model, setModel] = useState<(typeof MODEL_OPTIONS)[number]["value"]>(
    "google/gemini-2.5-flash",
  );
  const [temperature, setTemperature] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("page_view");
    try {
      const raw = sessionStorage.getItem("promptprobe.prefill");
      if (!raw) return;
      sessionStorage.removeItem("promptprobe.prefill");
      const p = JSON.parse(raw) as {
        system?: string; user?: string; model?: string; temperature?: number; runs?: number;
      };
      if (p.system != null) setSystem(p.system);
      if (p.user != null) setUser(p.user);
      if (p.model) setModel(p.model as typeof model);
      if (typeof p.temperature === "number") setTemperature(p.temperature);
      if (typeof p.runs === "number") setRuns(p.runs);
    } catch { /* ignore */ }
  }, []);

  function onModelChange(v: typeof model) {
    setModel(v);
    track("model_selected", { model: v });
  }

  function onRunsChange(v: number) {
    setRuns(v);
    track("run_count_changed", { run_count: v });
  }

  function loadExample(name: string) {
    const ex = EXAMPLES.find((e) => e.name === name);
    if (!ex) return;
    setSystem(ex.system ?? "");
    setUser(ex.user);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user.trim() || loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await probe({
        data: { systemPrompt: system, userPrompt: user, runs, model, temperature },
      });
      const outputs = result.runs.map((r) => r.output);
      const score = reliabilityScore(outputs);
      const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      saveTest({
        id,
        createdAt: Date.now(),
        title: titleFromPrompt(user),
        systemPrompt: system,
        userPrompt: user,
        model: result.model,
        temperature: result.temperature,
        runs: result.runs,
        score,
      });
      navigate({ to: "/test/$id", params: { id } });
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong running the test.");
    } finally {
      setLoading(false);
    }
  }

  const runsHint =
    runs <= 3 ? "Fast check · 3 is usually enough to spot variance" :
    runs <= 6 ? "Balanced · catches most drift patterns" :
    "Thorough · best for prompts you'll run at scale";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <Link
          to="/tests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Past Tests
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Test a Prompt</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Run your prompt {runs} times and see if it gives reliable outputs — or drifts in
          ways that would break automation.
        </p>

        <div className="mt-8">
          <p className="label-caps flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Load an example
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={() => loadExample(ex.name)}
                className="rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-foreground/90 transition hover:border-primary/50 hover:bg-accent/60"
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-card backdrop-blur"
        >
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="system">
                System Prompt <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="system"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="You are an expert at..."
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-input bg-background/60 px-3.5 py-2.5 font-mono text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground" htmlFor="user">
                Your Prompt
              </label>
              <textarea
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Paste the prompt you want to reliability-test. The more specific, the better the analysis."
                rows={8}
                required
                className="mt-2 w-full resize-y rounded-lg border border-input bg-background/60 px-3.5 py-2.5 font-mono text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {user.length.toLocaleString()} chars · {user.trim() ? user.trim().split(/\s+/).length : 0} words
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-foreground" htmlFor="model">
                  Model
                </label>
                <select
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value as typeof model)}
                  className="mt-2 w-full rounded-lg border border-input bg-background/60 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} — {m.hint}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-baseline justify-between text-sm font-semibold text-foreground" htmlFor="temp">
                  Temperature
                  <span className="font-mono text-primary">{temperature.toFixed(1)}</span>
                </label>
                <input
                  id="temp"
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="mt-3 w-full accent-[oklch(0.72_0.19_295)]"
                />
                <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>0 — deterministic</span>
                  <span>2 — wild</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-semibold text-foreground" htmlFor="runs">
                  How many times to run it
                </label>
                <span className="font-mono text-2xl font-semibold text-primary">{runs}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{runsHint}</p>
              <input
                id="runs"
                type="range"
                min={2}
                max={10}
                value={runs}
                onChange={(e) => setRuns(Number(e.target.value))}
                className="mt-3 w-full accent-[oklch(0.72_0.19_295)]"
              />
              <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>2 — quick</span>
                <span>10 — thorough</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-foreground">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !user.trim()}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Running {runs} calls…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Run Test
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          LLMs are probabilistic — PromptProbe helps you detect variance, not guarantee outcomes.
        </p>
      </main>
    </div>
  );
}
