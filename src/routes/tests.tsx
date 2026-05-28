import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, History, Trash2, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { deleteTest, loadTests, type StoredTest } from "@/lib/probe-utils";

export const Route = createFileRoute("/tests")({
  head: () => ({
    meta: [
      { title: "Past Tests — PromptProbe" },
      { name: "description", content: "Your history of prompt reliability tests." },
    ],
  }),
  component: TestsPage,
});

function scoreColor(s: number) {
  if (s >= 85) return "text-success";
  if (s >= 60) return "text-warning";
  return "text-destructive";
}

function TestsPage() {
  const [tests, setTests] = useState<StoredTest[] | null>(null);

  useEffect(() => {
    setTests(loadTests());
  }, []);

  function onDelete(id: string) {
    deleteTest(id);
    setTests(loadTests());
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Past Tests</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Stored locally in your browser. Nothing leaves this device except the prompts you run.
            </p>
          </div>
          <Link
            to="/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gradient-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New Test
          </Link>
        </div>

        <div className="mt-8">
          {tests === null ? (
            <div className="h-24 animate-pulse rounded-2xl bg-card/40" />
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
              <History className="h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold">No tests yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Run your first prompt to see how reliable it is. Results appear here.
              </p>
              <Link
                to="/new"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> Test a prompt
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {tests.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-stretch gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-card backdrop-blur transition hover:border-primary/40"
                >
                  <Link
                    to="/test/$id"
                    params={{ id: t.id }}
                    className="flex flex-1 items-center gap-4 overflow-hidden"
                  >
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/50 ring-1 ring-border/70 ${scoreColor(t.score)}`}>
                      <span className="font-mono text-lg font-semibold">{t.score}</span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">score</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString()} · {t.runs.length} runs · {t.model.split("/")[1]} · temp {t.temperature.toFixed(1)}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg border border-transparent text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete test"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
