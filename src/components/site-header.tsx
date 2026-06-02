import { Link } from "@tanstack/react-router";
import { History, Plus } from "lucide-react";
import logoUrl from "@/assets/promptprobe-logo.png";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 md:py-3.5">
        <Link to="/" className="group flex items-center gap-2.5 md:gap-3">
          <img
            src={logoUrl}
            alt="PromptProbe logo"
            width={40}
            height={40}
            className="h-8 w-8 md:h-10 md:w-10 shrink-0 object-contain transition group-hover:scale-105"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">PromptProbe</span>
            <span className="label-caps text-muted-foreground">Test your prompt. Trust your output.</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/tests"
            className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-accent/60"
          >
            <History className="h-4 w-4" /> Past Tests
          </Link>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Test a Prompt
          </Link>
        </nav>
      </div>
    </header>
  );
}
