import { trackEvent } from "@/lib/api/analytics.functions";

const SESSION_KEY = "promptprobe.session_id";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

type Payload = {
  model?: string | null;
  run_count?: number | null;
  reliability_score?: number | null;
  prompt_length?: number | null;
};

export function track(
  event_name:
    | "page_view"
    | "prompt_test_started"
    | "prompt_test_completed"
    | "model_selected"
    | "run_count_changed",
  payload: Payload = {},
) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const session_id = getSessionId();
  // Fire and forget — never block UI or surface errors to users.
  trackEvent({
    data: {
      event_name,
      path,
      session_id,
      model: payload.model ?? null,
      run_count: payload.run_count ?? null,
      reliability_score: payload.reliability_score ?? null,
      prompt_length: payload.prompt_length ?? null,
    },
  }).catch(() => {});
}
