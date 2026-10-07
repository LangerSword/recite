/**
 * The studio command parser: forgiving enough for dictation.
 *
 * Voice input arrives with openers ("hey so can you"), fillers ("um", "uh"),
 * and phrase noise ("like a", "from the canvas"). The parser strips those
 * first, then matches a verb and splits entities. Pure string work, no DOM.
 */

import type { StudioOp } from "./graph";

/** What the parser can emit: graph ops, plus the controller-level undo. */
export type StudioCommand = StudioOp | { kind: "undo" };

export type ParseResult =
  | { ok: true; op: StudioCommand }
  | { ok: false; reason: string };

const INNER_FILLERS = new Set(["um", "uh", "er", "hmm", "mm"]);
const LEADING_FILLERS = new Set([
  "um", "uh", "er", "hmm", "ok", "okay", "so", "hey", "just", "please", "basically", "actually",
]);
const OPENERS = [
  "can you", "could you", "would you", "i want to", "i wanna", "let's", "lets",
  "hey", "ok", "okay", "so", "um", "uh", "please", "now", "next",
];
const TRAILING_PHRASES = [
  "from the canvas", "from the diagram", "from the board", "on the canvas",
  "to the canvas", "to the diagram", "please",
];

const VERBS: Array<{ re: RegExp; kind: "add" | "connect" | "remove" | "rename" | "undo" | "clear" }> = [
  { re: /^(add|create|make|put|new)\b/i, kind: "add" },
  { re: /^(connect|link|wire|join)\b/i, kind: "connect" },
  { re: /^(remove|delete|drop)\b/i, kind: "remove" },
  { re: /^(rename|call)\b/i, kind: "rename" },
  { re: /^(undo)\b/i, kind: "undo" },
  { re: /^(clear|reset|wipe)\b/i, kind: "clear" },
];

function stripOpeners(input: string): string {
  let text = input.trim();
  let changed = true;
  while (changed && text) {
    changed = false;
    const lower = text.toLowerCase();
    for (const opener of OPENERS) {
      if (lower.startsWith(opener + " ") || lower === opener) {
        text = text.slice(opener.length).trim();
        changed = true;
        break;
      }
    }
  }
  return text;
}

function stripTrailing(text: string): string {
  let out = text.trim();
  let changed = true;
  while (changed && out) {
    changed = false;
    const lower = out.toLowerCase();
    for (const phrase of TRAILING_PHRASES) {
      if (lower.endsWith(" " + phrase) || lower === phrase) {
        out = out.slice(0, out.length - phrase.length).trim();
        changed = true;
        break;
      }
    }
    const punct = out.match(/[.!?,;:]+$/);
    if (punct) {
      out = out.slice(0, out.length - punct[0].length).trim();
      changed = true;
    }
  }
  return out;
}

/** Strip fillers and leading articles / filler phrases from a spoken label. */
export function cleanLabel(input: string): string {
  let words = input
    .trim()
    .split(/\s+/)
    .filter((w) => w && !INNER_FILLERS.has(w.toLowerCase()));

  let changed = true;
  while (changed && words.length) {
    changed = false;
    const w = words[0].toLowerCase();
    const w2 = words[1]?.toLowerCase();
    if (LEADING_FILLERS.has(w)) {
      words = words.slice(1);
      changed = true;
      continue;
    }
    // "like a queue" is filler; "a like button" is not (handled by word order)
    if (w === "like" && (w2 === "a" || w2 === "an" || w2 === "the")) {
      words = words.slice(1);
      changed = true;
      continue;
    }
    if (w === "a" || w === "an" || w === "the") {
      words = words.slice(1);
      changed = true;
    }
  }

  return stripTrailing(words.join(" "));
}

export function parseCommand(input: string): ParseResult | null {
  const raw = input.trim();
  if (!raw) return null;

  const text = stripOpeners(raw);
  if (!text) return null;

  for (const { re, kind } of VERBS) {
    const match = text.match(re);
    if (!match) continue;
    const rest = stripOpeners(text.slice(match[0].length).replace(/^[\s,:—-]+/, ""));

    switch (kind) {
      case "undo":
        return { ok: true, op: { kind: "undo" } };
      case "clear":
        return { ok: true, op: { kind: "clear" } };
      case "add": {
        const label = cleanLabel(rest);
        if (!label) return { ok: false, reason: "add needs a name, like: add payments api" };
        return { ok: true, op: { kind: "add", label } };
      }
      case "connect": {
        const parts = rest.split(/\s+(?:to|with|into|and)\s+/i);
        if (parts.length < 2) {
          return { ok: false, reason: "connect needs two names, like: connect payments api to postgres" };
        }
        const a = cleanLabel(parts[0]);
        const b = cleanLabel(parts.slice(1).join(" "));
        if (!a || !b) return { ok: false, reason: "connect needs two names" };
        return { ok: true, op: { kind: "connect", a, b } };
      }
      case "remove": {
        const label = cleanLabel(rest);
        if (!label) return { ok: false, reason: "remove needs a name" };
        return { ok: true, op: { kind: "remove", label } };
      }
      case "rename": {
        const parts = rest.split(/\s+(?:to|as|into)\s+/i);
        if (parts.length < 2) {
          return { ok: false, reason: "rename needs both names, like: rename postgres to database" };
        }
        const from = cleanLabel(parts[0]);
        const to = cleanLabel(parts.slice(1).join(" "));
        if (!from || !to) return { ok: false, reason: "rename needs both names" };
        return { ok: true, op: { kind: "rename", from, to } };
      }
    }
  }

  // An undo/clear caught above; anything else is unknown.
  if (/^(undo)\b/i.test(raw.trim())) return { ok: true, op: { kind: "undo" } };

  return {
    ok: false,
    reason: "didn't catch that. Try: add payments api, connect payments api to postgres, remove, rename, undo, clear",
  };
}
