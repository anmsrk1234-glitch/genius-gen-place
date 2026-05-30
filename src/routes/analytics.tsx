import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Lock, Users, Play, CheckCircle2, Activity, Gauge, Boxes } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  getAnalyticsStats,
  type AnalyticsStats,
} from "@/lib/api/analytics.functions";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — PromptProbe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

const KEY_STORAGE = "promptprobe.admin_key";

function AnalyticsPage() {
  const fetchStats = useServerFn(getAnalyticsStats);
  const [key, setKey] = useState("");
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull key from ?key= or remembered localStorage on first load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("key");
    const stored = (() => {
      try { return localStorage.getItem(KEY_STORAGE); } catch { return null; }
    })();
    const initial = fromUrl ?? stored;
    if (initial) {
      setKey(initial);
      void load(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(k: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStats({ data: { key: k } });
      setStats(res);
      try { localStorage.setItem(KEY_STORAGE, k); } catch { /* ignore */ }
    } catch (e) {
      setError((e as Error).message ?? "Failed to load analytics.");
      setStats(null);
      try { localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">Internal Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private dashboard. Visible only with the admin key.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (key.trim()) void load(key.trim()); }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Admin key"
              className="w-full rounded-lg border border-input bg-background/60 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            View stats
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-foreground">
            {error}
          </div>
        )}

        {stats && <StatsView stats={stats} />}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, hint,
}: {
  icon: typeof Users; label: string; value: string | number; hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-5 shadow-card backdrop-blur">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatsView({ stats }: { stats: AnalyticsStats }) {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Unique visitors" value={stats.totalVisitors} hint={`${stats.totalPageViews} page views`} />
        <StatCard icon={Play} label="Tests started" value={stats.totalTestsStarted} />
        <StatCard icon={CheckCircle2} label="Tests completed" value={stats.totalTestsCompleted} hint={`${stats.completionRate}% completion rate`} />
        <StatCard icon={Activity} label="Avg run count" value={stats.avgRunCount || "—"} />
        <StatCard
          icon={Gauge}
          label="Avg reliability"
          value={stats.avgReliabilityScore != null ? `${stats.avgReliabilityScore}%` : "—"}
        />
        <StatCard icon={Boxes} label="Models used" value={stats.modelUsage.length} />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Most used models
        </h2>
        <div className="mt-3 rounded-xl border border-border/70 bg-card/60 p-5 shadow-card">
          {stats.modelUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test runs yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.modelUsage.map((m) => {
                const max = stats.modelUsage[0].count || 1;
                const pct = Math.round((m.count / max) * 100);
                return (
                  <li key={m.model}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-mono text-foreground">{m.model}</span>
                      <span className="font-mono text-muted-foreground">{m.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent events
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Runs</th>
                <th className="px-4 py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentEvents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No events yet.</td></tr>
              ) : stats.recentEvents.map((e, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.event_name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{e.model ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{e.run_count ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {e.reliability_score != null ? `${e.reliability_score}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
