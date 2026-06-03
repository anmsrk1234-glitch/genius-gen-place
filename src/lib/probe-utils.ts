// Pure utilities — safe on client and server.

export const MODEL_OPTIONS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Fast · default" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Top reasoning" },
] as const;

export const EXAMPLES: { name: string; system?: string; user: string }[] = [
  {
    name: "Invoice extraction",
    system: "You extract structured data from invoices. Always reply with valid JSON only — no prose.",
    user: `Extract vendor, invoice_number, total_amount, currency, and due_date from this invoice:

ACME Cloud Services
Invoice #INV-2034
Date: 2025-03-12
Due: 2025-04-12
Subtotal: $1,240.00
Tax: $99.20
Total: $1,339.20 USD`,
  },
  {
    name: "Support ticket classifier",
    system: 'Classify the ticket. Reply with one JSON object: {"category": "...", "priority": "low|medium|high", "needs_human": true|false}. Categories: billing, bug, feature_request, account.',
    user: "My card was charged twice for the same subscription this morning. Please refund the duplicate ASAP — this is the second time it happens.",
  },
  {
    name: "Contact extraction",
    user: `Pull every name, email, and phone number from the text below into a JSON array of {name, email, phone}.

Hey, please reach out to Maria Chen (maria.c@northwind.io, +1 415-555-0132) about the renewal, and loop in Devon Park <devon@northwind.io> if you can.`,
  },
  {
    name: "20-word summary",
    user: "Summarize the following text in exactly 20 words:\n\nLarge language models are statistical systems trained on vast text corpora. Their outputs are inherently probabilistic, meaning the same prompt can yield different responses across calls, which complicates building reliable downstream automation.",
  },
  {
    name: "Spanish translation",
    user: "Translate to natural, friendly Spanish (Latin America). Reply with only the translation:\n\n\"Your package is on its way and should arrive on Thursday. Tracking number 1Z9999.\"",
  },
];

// Tokenize for similarity — lowercased word-ish tokens.
function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

// Jaccard similarity over token sets.
export function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 1 : inter / union;
}

// Reliability score (0–100) = average pairwise Jaccard similarity.
export function reliabilityScore(outputs: string[]): number {
  const valid = outputs.filter((o) => o && o.trim().length > 0);
  if (valid.length < 2) return valid.length === 1 ? 100 : 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      sum += jaccard(valid[i], valid[j]);
      count++;
    }
  }
  return Math.round((sum / count) * 100);
}

export function recommendation(score: number, hasErrors: boolean): {
  label: string;
  tone: "good" | "warn" | "bad";
  detail: string;
} {
  if (hasErrors) {
    return {
      label: "Investigate",
      tone: "bad",
      detail: "Some runs failed. Fix errors before judging reliability.",
    };
  }
  if (score >= 85)
     return {
       label: "Highly consistent",
      tone: "good",
      detail: "Outputs remain very similar across runs.",
    };
  if (score >= 60)
    return {
     label: "Moderate variance",
     tone: "warn",
     detail: "Outputs vary between runs. Review whether the variation is acceptable for your use case.",
   };
     return {
      label: "High variance",
      tone: "bad",
      detail: "Outputs differ significantly between runs. Structured automation workflows may require a more constrained prompt.",
    };
}

// Word-level diff highlights (token-by-token vs the first output).
export function diffAgainstBase(base: string, other: string): {
  text: string;
  changed: boolean;
}[] {
  const baseTokens = new Set(tokenize(base));
  const parts = other.split(/(\s+)/);
  return parts.map((p) => {
    const isWs = /^\s+$/.test(p);
    if (isWs || p.length === 0) return { text: p, changed: false };
    const norm = p.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!norm) return { text: p, changed: false };
    return { text: p, changed: !baseTokens.has(norm) };
  });
}

export type StoredTest = {
  id: string;
  createdAt: number;
  title: string;
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  runs: { index: number; output: string; ms: number; error?: string }[];
  score: number;
};

const STORAGE_KEY = "promptprobe.tests.v1";

export function loadTests(): StoredTest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTest(t: StoredTest): void {
  if (typeof window === "undefined") return;
  const all = loadTests();
  all.unshift(t);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 100)));
}

export function getTest(id: string): StoredTest | undefined {
  return loadTests().find((t) => t.id === id);
}

export function deleteTest(id: string): void {
  if (typeof window === "undefined") return;
  const all = loadTests().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function titleFromPrompt(p: string): string {
  const first = p.trim().split(/\n/)[0] ?? "";
  return first.length > 70 ? first.slice(0, 67) + "…" : first || "Untitled prompt";
}
