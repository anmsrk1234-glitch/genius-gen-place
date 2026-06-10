import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Repeat2, Sparkles, GitCompareArrows, ShieldCheck, AlertTriangle, TrendingDown, Wand2 } from "lucide-react";

const EXAMPLE_PREFILL = {
  system: "",
  user: `You are approving refunds.

Rules:
- Deny if the purchase was made more than 30 days ago.
- Otherwise approve.

Customer:
Purchased 14 days ago.
Has not requested a refund before.

Return ONLY:
APPROVE
or
DENY`,
  temperature: 0.2,
  runs: 3,
};
import { SiteHeader } from "@/components/site-header";
import logoUrl from "@/assets/promptprobe-logo.png";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PromptProbe — Catch prompt drift before it ships" },
      {
        name: "description",
        content:
          "Run any LLM prompt multiple times and instantly catch output drift before it breaks your automation.",
      },
      { property: "og:title", content: "PromptProbe — Catch prompt drift before it ships" },
      {
        property: "og:description",
        content:
          "Run any LLM prompt N times, see side-by-side diffs, and get a reliability score.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    track("page_view");
  }, []);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-6 md:pt-16">
        <section className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-accent/60 ring-1 ring-primary/30 shadow-glow">
            <img src={logoUrl} alt="PromptProbe logo" className="h-10 w-10 md:h-14 md:w-14 object-contain" />
          </span>
          <h1 className="mt-4 md:mt-7 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Does your prompt give the{" "}
            <span className="text-gradient">same answer every time?</span>
          </h1>
          <p className="mt-3 md:mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-lg">
            Run any prompt multiple times and instantly catch output drift before it breaks
            your automation or ships inconsistent responses.
          </p>
          <div className="mt-5 md:mt-8 flex flex-col items-center gap-3">
            <Link
              to="/new"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
            >
              Test your first prompt
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <p className="text-xs text-muted-foreground">~30 seconds. No setup required.</p>
          </div>
        </section>

        <section className="mt-24">
          <p className="label-caps text-center text-muted-foreground">How it works</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "Step 1",
                title: "Paste your prompt",
                body: "The exact prompt you send to your AI — system prompt, user message, or both.",
                icon: Sparkles,
              },
              {
                step: "Step 2",
                title: "We run it N times",
                body: "Same prompt, multiple LLM calls, zero caching. Real-world variance.",
                icon: Repeat2,
              },
              {
                step: "Step 3",
                title: "See exactly where it drifts",
                body: "Side-by-side diff, reliability score, and a shipping recommendation.",
                icon: GitCompareArrows,
              },
            ].map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-border/70 bg-card/60 p-6 shadow-card backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/60 ring-1 ring-primary/30">
                    <s.icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="label-caps text-muted-foreground">{s.step}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="rounded-2xl border border-border/70 bg-card/50 p-7 shadow-card">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Built for:</h4>
            </div>
            <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {[
                "AI extraction pipelines that need consistent JSON output",
                "Chatbots where tone and structure matter",
                "Classification prompts used in automation",
                "Any prompt you plan to run at scale",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <DriftExampleSection />
      </main>
    </div>
  );
}

type DiffLine = { text: string; kind: "ctx" | "add" | "del" };

const run1Diff: DiffLine[] = [
  { text: "{", kind: "ctx" },
  { text: '  "intent": "refund_request",', kind: "ctx" },
  { text: '  "confidence": 0.92,', kind: "del" },
  { text: '  "customer_id": "u_8421",', kind: "del" },
  { text: '  "tier": "pro"', kind: "del" },
  { text: "}", kind: "ctx" },
];

const run2Diff: DiffLine[] = [
  { text: "{", kind: "ctx" },
  { text: '  "intent": "refund_request",', kind: "ctx" },
  { text: '  "confidence": 0.74,', kind: "add" },
  { text: '  "customer": {', kind: "add" },
  { text: '    "id": "u_8421"', kind: "add" },
  { text: "  },", kind: "add" },
  { text: '  "notes": "see thread"', kind: "add" },
  { text: "}", kind: "ctx" },
];

function DiffPane({ label, lines, tone }: { label: string; lines: DiffLine[]; tone: "base" | "drift" }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
      <div className="flex items-center justify-between border-b border-border/70 bg-card/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tone === "base" ? "bg-success" : "bg-warning"}`} />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <span className="label-caps text-muted-foreground">application/json</span>
      </div>
      <pre className="overflow-x-auto px-0 py-2 font-mono text-[12.5px] leading-relaxed">
        {lines.map((l, i) => {
          const bg =
            l.kind === "add"
              ? "bg-success/10 text-success-foreground/90 border-l-2 border-success"
              : l.kind === "del"
              ? "bg-destructive/10 text-destructive-foreground/90 border-l-2 border-destructive"
              : "border-l-2 border-transparent text-muted-foreground";
          const sign = l.kind === "add" ? "+" : l.kind === "del" ? "-" : " ";
          return (
            <div key={i} className={`flex gap-3 px-4 ${bg}`}>
              <span className="w-4 select-none text-muted-foreground/60">{i + 1}</span>
              <span className="w-3 select-none opacity-70">{sign}</span>
              <span className="whitespace-pre">{l.text}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

function DriftExampleSection() {
  const driftItems = [
    "Structure changed",
    "Key names changed",
    "Confidence variance detected",
    "Additional fields appeared",
  ];

  return (
    <section className="mt-24">
      <div className="text-center">
        <p className="label-caps text-muted-foreground">Live example</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          See a Real Drift <span className="text-gradient">Example</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          The prompt looked fine. The outputs weren't.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-card backdrop-blur">
        {/* Report header */}
        <div className="flex flex-col gap-3 border-b border-border/70 bg-card/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/60 ring-1 ring-primary/30">
              <GitCompareArrows className="h-4 w-4 text-primary" />
            </span>
            <div>
              <p className="label-caps text-muted-foreground">Prompt</p>
              <p className="font-mono text-xs text-foreground sm:text-sm">
                Extract customer support ticket data as JSON
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/50 px-4 py-2">
            <span className="label-caps text-muted-foreground">Reliability</span>
            <span className="font-mono text-lg font-semibold text-warning">64%</span>
            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
              <div className="h-full w-[64%] bg-warning" />
            </div>
          </div>
        </div>

        {/* Diff */}
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <DiffPane label="Run 1" lines={run1Diff} tone="base" />
          <DiffPane label="Run 2" lines={run2Diff} tone="drift" />
        </div>

        {/* Drift summary + risk */}
        <div className="grid gap-4 border-t border-border/70 p-5 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-background/50 p-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Detected Drift</h3>
            </div>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              {driftItems.map((d) => (
                <li key={d} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/50 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Risk Assessment</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <span className="text-success">Safe</span> for human review.{" "}
              <span className="text-destructive">Risky</span> for production automation.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
                Human review: OK
              </span>
              <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
                Automation: Blocked
              </span>
            </div>
          </div>
        </div>

        {/* Callout */}
        <div className="border-t border-border/70 bg-accent/20 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-foreground/90">
              Small output changes can silently break parsers, workflows, agents, and automations.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          to="/new"
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
        >
          Test My Prompt
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
