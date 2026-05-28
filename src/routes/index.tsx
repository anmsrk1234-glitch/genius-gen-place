import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Repeat2, Sparkles, GitCompareArrows, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

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
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-16">
        <section className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/60 ring-1 ring-primary/30 shadow-glow">
            <Repeat2 className="h-7 w-7 text-primary" />
          </span>
          <h1 className="mt-7 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Does your prompt give the{" "}
            <span className="text-gradient">same answer every time?</span>
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Run any prompt multiple times and instantly catch output drift before it breaks
            your automation or ships inconsistent responses.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
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
      </main>
    </div>
  );
}
