import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "promptprobe.session_id";
const SUBMITTED_PREFIX = "promptprobe.feedback.";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function FeedbackPrompt({ runId }: { runId?: string | null }) {
  const storageKey = `${SUBMITTED_PREFIX}${runId ?? "anon"}`;
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) setSubmitted(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function submit(type: "yes" | "no") {
    setSubmitted(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    // Fire-and-forget; silent on failure.
    void supabase
      .from("feedback")
      .insert({
        feedback_type: type,
        session_id: getSessionId(),
        run_id: runId ?? null,
      })
      .then(() => undefined, () => undefined);
  }

  return (
    <section className="mt-8 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-card backdrop-blur">
      {submitted ? (
        <p className="text-center text-sm font-medium text-foreground">
          Thanks for your feedback!
        </p>
      ) : (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4">
          <p className="text-sm font-medium text-foreground">
            Did PromptProbe help you discover something useful?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => submit("yes")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-accent/60"
              aria-label="Yes, this was useful"
            >
              <ThumbsUp className="h-4 w-4" /> Yes
            </button>
            <button
              type="button"
              onClick={() => submit("no")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-foreground/90 transition hover:bg-accent/60"
              aria-label="No, this was not useful"
            >
              <ThumbsDown className="h-4 w-4" /> No
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
