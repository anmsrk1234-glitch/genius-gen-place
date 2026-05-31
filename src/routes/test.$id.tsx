import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  AlertCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  diffAgainstBase,
  getTest,
  recommendation,
  type StoredTest,
} from "@/lib/probe-utils";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/test/$id")({
  head: () => ({
    meta: [
      { title: "Test result — PromptProbe" },
      { name: "description", content: "Side-by-side outputs and reliability score for your prompt." },
    ],
  }),
  component: TestDetail,
});

function toneClasses(tone: "good" | "warn" | "bad") {
  if (tone === "good")
    return "border-success/40 bg-success/10 text-success";
  if (tone === "warn")
    return "border-warning/40 bg-warning/10 text-warning";
  return "border-destructive/40 bg-destructive/10 text-destructive";
}

function TestDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<StoredTest | null | undefined>(undefined);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    track("page_view");
    const t = getTest(id);
    setTest(t ?? null);
  }, [id]);
  

  const baseOutput = test?.runs.find((r) => !r.error && r.output)?.output ?? "";
  const hasErrors = !!test?.runs.some((r) => r.error);
  const rec = useMemo(
    () => (test ? recommendation(test.score, hasErrors) : null),
    [test, hasErrors],
  );

  if (test === undefined) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="h-32 animate-pulse rounded-2xl bg-card/40" />
        </div>
      </div>
    );
  }
  if (test === null) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="text-2xl font-semibold">Test not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This test isn't in your browser's history. It may have been deleted or run on
            another device.
          </p>
          <Link
            to="/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Run a new test
          </Link>
        </main>
      </div>
    );
  }

  async function copyText(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1400);
    } catch {
      /* ignore */
    }
  }

  function downloadJson() {
    if (!test) return;
    const blob = new Blob([JSON.stringify(test, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promptprobe-${test.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function rerun() {
    if (!test) return;
    // Lightweight: take user to /new pre-filled via sessionStorage hand-off
    sessionStorage.setItem(
      "promptprobe.prefill",
      JSON.stringify({
        system: test.systemPrompt,
        user: test.userPrompt,
        model: test.model,
        temperature: test.temperature,
        runs: test.runs.length,
      }),
    );
    navigate({ to: "/new" });
  }

  const score = test.score;
  const scoreColor =
    score >= 85 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <Link
          to="/tests"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Past Tests
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{test.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(test.createdAt).toLocaleString()} · {test.runs.length} runs ·{" "}
              {test.model} · temperature {test.temperature.toFixed(1)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadJson}
              className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-accent/60"
            >
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button
              type="button"
              onClick={rerun}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
            >
              <RotateCcw className="h-4 w-4" /> Re-run
            </button>
          </div>
        </div>

        {/* Summary card */}
        <section className="mt-6 grid gap-4 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5 rounded-2xl border border-border/70 bg-card/60 p-6 shadow-card backdrop-blur">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-border/60" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 264} 264`}
                  className={scoreColor}
                />
              </svg>
              <div className="text-center">
                <div className={`font-mono text-2xl font-semibold ${scoreColor}`}>{score}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</div>
              </div>
            </div>
            <div>
              <p className="label-caps text-muted-foreground">Reliability score</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                Measures word-level consistency between runs. Creative prompts naturally score lower.
              </p>
            </div>
          </div>

          {rec && (
            <div
              className={`flex flex-col justify-center gap-2 rounded-2xl border p-6 shadow-card backdrop-blur ${toneClasses(rec.tone)}`}
            >
              <p className="label-caps opacity-80">Recommendation</p>
              <p className="text-xl font-semibold">{rec.label}</p>
              <p className="text-sm leading-relaxed opacity-90">{rec.detail}</p>
            </div>
          )}
        </section>

        {/* Prompt echo */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {test.systemPrompt.trim() && (
            <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-card">
              <p className="label-caps text-muted-foreground">System prompt</p>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                {test.systemPrompt}
              </pre>
            </div>
          )}
          <div className={`rounded-2xl border border-border/70 bg-card/60 p-5 shadow-card ${test.systemPrompt.trim() ? "" : "md:col-span-2"}`}>
            <p className="label-caps text-muted-foreground">User prompt</p>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
              {test.userPrompt}
            </pre>
          </div>
        </section>

        {/* Outputs */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Outputs</h2>
            <p className="text-xs text-muted-foreground">
              Run #1 is the baseline · highlighted words drift from it
            </p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {test.runs.map((r) => {
              const isBase = r.output === baseOutput && !r.error;
              const parts = !r.error && r.output ? diffAgainstBase(baseOutput, r.output) : null;
              return (
                <article
                  key={r.index}
                  className="flex flex-col rounded-2xl border border-border/70 bg-card/60 shadow-card backdrop-blur"
                >
                  <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/60 font-mono text-xs font-semibold text-primary ring-1 ring-primary/30">
                        {r.index}
                      </span>
                      <span className="text-sm font-medium">
                        Run {r.index}
                        {isBase && (
                          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                            baseline
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.ms} ms
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(r.output, r.index)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-accent/60 hover:text-foreground"
                        aria-label="Copy output"
                      >
                        {copiedIdx === r.index ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-success" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </header>
                  <div className="max-h-[420px] overflow-auto px-4 py-3.5">
                    {r.error ? (
                      <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{r.error}</span>
                      </div>
                    ) : parts ? (
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/95">
                        {parts.map((p, i) =>
                          p.changed ? (
                            <mark
                              key={i}
                              className="rounded bg-primary/25 px-0.5 text-foreground"
                            >
                              {p.text}
                            </mark>
                          ) : (
                            <span key={i}>{p.text}</span>
                          ),
                        )}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Empty response</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
