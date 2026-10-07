import { enterPage, scrollReveal } from "../lib/motion";
import { mountWorldHero } from "../components/world-hero";
import { StudioCanvas } from "../studio/canvas";
import { applyOp, emptyGraph, summarize, type StudioGraph } from "../studio/graph";
import { parseCommand } from "../studio/parse";

const EXAMPLES = [
  "add payments api",
  "connect payments api to postgres",
  "add a cache for the reads",
  "undo",
];

/* Minimal Web Speech API surface — Chromium/Safari ship it; Firefox does not,
   and the box stays as the fallback. */
interface SpeechAlternativeLike {
  transcript: string;
}
interface SpeechResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
}
interface SpeechResultEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

interface StudioLogEntry {
  raw: string;
  summary: string;
}

const STORAGE_KEY = "recite.studio.v1";

export default {
  title: "recite: speak your system",

  render(): string {
    return `
      <section class="world" data-world aria-label="recite: the living studio"></section>

      <section class="page page--studio" id="studio-tool">
        <p class="eyebrow">The studio</p>
        <h1>Where it lands.</h1>
        <p class="lede">
          Give the mic permission and speak — or dictate with Flow, or type.
          Every command lands on the canvas, and the whole design exports for
          your agent.
        </p>

        <div class="studio-grid">
          <div class="studio-col">
            <div class="speak">
              <label class="visually-hidden" for="speak">Speak a command</label>
              <textarea
                id="speak"
                rows="2"
                spellcheck="false"
                autocomplete="off"
                placeholder="Speak. Commands land here."
              ></textarea>
              <div class="speak-row">
                <button class="mic-btn" id="studio-mic" type="button">
                  <span class="mic-dot" aria-hidden="true"></span>
                  <span class="mic-label">speak</span>
                </button>
                <span class="speak-hint">press enter to run · shift+enter for a new line</span>
              </div>
            </div>

            <p class="studio-feedback" id="speak-feedback" role="status" aria-live="polite"></p>

            <div class="say-row">
              <span class="say-label">say</span>
              <div class="say-chips">
                ${EXAMPLES.map(
                  (example) =>
                    `<button class="say" type="button" data-say="${example}">${example}</button>`,
                ).join("")}
              </div>
            </div>

            <ol class="slog" id="studio-log" aria-label="Session log"></ol>
          </div>

          <div class="canvas-panel">
            <div class="canvas-bar">
              <span>canvas</span>
              <span id="canvas-count">0 nodes · 0 connections</span>
              <span class="canvas-actions">
                <button class="mini-btn" id="studio-undo" type="button">undo</button>
                <button class="mini-btn" id="studio-clear" type="button">clear</button>
              </span>
            </div>
            <div class="canvas-stage">
              <svg id="studio-canvas" viewBox="0 0 520 260" preserveAspectRatio="xMidYMid meet"
                   role="img" aria-label="Diagram: empty"></svg>
              <p class="canvas-empty" id="canvas-empty">Say something. Nodes land here.</p>
            </div>
            <div class="canvas-export">
              <span class="say-label">for your agent</span>
              <button class="mini-btn" id="export-md" type="button">copy spec</button>
              <button class="mini-btn" id="export-json" type="button">copy json</button>
            </div>
          </div>
        </div>

        <p class="note">
          Built in the open, session by session. Every session is recorded.
        </p>
      </section>
    `;
  },

  mount(root: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];

    const world = root.querySelector<HTMLElement>("[data-world]");
    if (world) cleanups.push(mountWorldHero(world));

    /* ── state ───────────────────────────────────────────────────────────── */

    let graph: StudioGraph = emptyGraph();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as StudioGraph;
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) graph = parsed;
      }
    } catch {
      /* fresh canvas */
    }
    const history: StudioGraph[] = [];
    const log: StudioLogEntry[] = [];

    /* ── elements ────────────────────────────────────────────────────────── */

    const canvasEl = root.querySelector<SVGSVGElement>("#studio-canvas");
    const canvas = canvasEl ? new StudioCanvas(canvasEl) : null;
    canvas?.sync(graph, null, false);

    const input = root.querySelector<HTMLTextAreaElement>("#speak");
    const feedback = root.querySelector<HTMLElement>("#speak-feedback");
    const logEl = root.querySelector<HTMLOListElement>("#studio-log");
    const countEl = root.querySelector<HTMLElement>("#canvas-count");
    const emptyEl = root.querySelector<HTMLElement>("#canvas-empty");
    const micBtn = root.querySelector<HTMLButtonElement>("#studio-mic");
    const undoBtn = root.querySelector<HTMLButtonElement>("#studio-undo");
    const clearBtn = root.querySelector<HTMLButtonElement>("#studio-clear");
    const mdBtn = root.querySelector<HTMLButtonElement>("#export-md");
    const jsonBtn = root.querySelector<HTMLButtonElement>("#export-json");

    /* ── helpers ─────────────────────────────────────────────────────────── */

    const persist = (): void => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
      } catch {
        /* storage full or blocked */
      }
    };

    const setFeedback = (text: string, error = false): void => {
      if (!feedback) return;
      feedback.textContent = text;
      feedback.classList.toggle("is-error", error);
    };

    const refresh = (): void => {
      if (countEl) {
        const n = graph.nodes.length;
        const e = graph.edges.length;
        countEl.textContent = `${n} node${n === 1 ? "" : "s"} · ${e} connection${e === 1 ? "" : "s"}`;
      }
      if (emptyEl) emptyEl.hidden = graph.nodes.length > 0;
    };

    const renderLog = (): void => {
      if (!logEl) return;
      logEl.replaceChildren(
        ...log.slice(0, 6).map((entry) => {
          const li = document.createElement("li");
          const raw = document.createElement("span");
          raw.className = "slog-raw";
          raw.textContent = `“${entry.raw}”`;
          const sum = document.createElement("span");
          sum.className = "slog-sum";
          sum.textContent = entry.summary;
          li.append(raw, sum);
          return li;
        }),
      );
    };

    const doUndo = (): void => {
      const prev = history.pop();
      if (!prev) {
        setFeedback("✗ nothing to undo", true);
        return;
      }
      graph = prev;
      log.unshift({ raw: "undo", summary: "stepped back" });
      renderLog();
      canvas?.sync(graph, null, false);
      persist();
      refresh();
      setFeedback("↩ stepped back");
    };

    /** Parse and apply one spoken/typed command. Returns true when applied. */
    const run = (raw: string): boolean => {
      const parsed = parseCommand(raw);
      if (!parsed) return false;
      if (!parsed.ok) {
        setFeedback(`✗ ${parsed.reason}`, true);
        return false;
      }
      const op = parsed.op;
      if (op.kind === "undo") {
        doUndo();
        return true;
      }
      const snapshot = structuredClone(graph);
      const result = applyOp(graph, op);
      if (result.error) {
        setFeedback(`✗ ${result.error}`, true);
        return false;
      }
      history.push(snapshot);
      graph = result.graph;
      const summary = summarize(op, graph, result.meta);
      log.unshift({ raw: raw.trim(), summary });
      renderLog();
      canvas?.sync(graph, result.meta);
      persist();
      refresh();
      setFeedback(`✓ ${summary}`);
      return true;
    };

    /* ── typed / Flow-dictated input ─────────────────────────────────────── */

    const onSubmit = (): void => {
      if (!input) return;
      const raw = input.value.trim();
      if (!raw) return;
      if (run(raw)) input.value = "";
      input.focus();
    };

    const onKey = (event: Event): void => {
      const ev = event as KeyboardEvent;
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        onSubmit();
      } else if (ev.key === "Escape" && input) {
        input.value = "";
      }
    };
    input?.addEventListener("keydown", onKey);
    cleanups.push(() => input?.removeEventListener("keydown", onKey));

    for (const chip of root.querySelectorAll<HTMLButtonElement>(".say")) {
      const handler = (): void => {
        const example = chip.dataset.say ?? "";
        if (example) run(example);
      };
      chip.addEventListener("click", handler);
      cleanups.push(() => chip.removeEventListener("click", handler));
    }

    /* ── the mic (Web Speech API, entirely in the browser) ───────────────── */

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    let rec: SpeechRecognitionLike | null = null;
    let wantListening = false;

    const setListeningUI = (on: boolean): void => {
      micBtn?.classList.toggle("is-listening", on);
      const label = micBtn?.querySelector<HTMLElement>(".mic-label");
      if (label) label.textContent = on ? "listening" : "speak";
    };

    const ensureRec = (): SpeechRecognitionLike | null => {
      if (rec || !SR) return rec;
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (event) => {
        let interim = "";
        let finals = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) finals += text;
          else interim += text;
        }
        if (interim && input) input.value = interim.trim();
        const raw = finals.trim();
        if (raw) {
          if (input) input.value = "";
          if (!run(raw)) setFeedback(`✗ heard “${raw}” — not a command yet`, true);
        }
      };
      rec.onerror = (event) => {
        const err = event.error ?? "unknown";
        if (err === "not-allowed" || err === "service-not-allowed") {
          wantListening = false;
          setListeningUI(false);
          setFeedback("✗ microphone permission denied — allow it in the browser prompt", true);
        } else if (err !== "no-speech" && err !== "aborted") {
          setFeedback(`✗ mic error: ${err}`, true);
        }
      };
      rec.onend = () => {
        if (wantListening) {
          try {
            rec?.start();
          } catch {
            /* already restarted */
          }
        } else {
          setListeningUI(false);
        }
      };
      return rec;
    };

    const toggleMic = (): void => {
      if (!SR) {
        setFeedback("✗ this browser can't listen — dictate with Flow into the box instead", true);
        return;
      }
      wantListening = !wantListening;
      if (wantListening) {
        const r = ensureRec();
        try {
          r?.start();
          setListeningUI(true);
          setFeedback("listening — speak a command");
        } catch {
          setFeedback("✗ mic is already starting", true);
        }
      } else {
        rec?.stop();
        setListeningUI(false);
        setFeedback("mic off");
      }
    };
    micBtn?.addEventListener("click", toggleMic);
    cleanups.push(() => {
      wantListening = false;
      rec?.stop();
    });

    /* ── buttons: undo / clear / export ──────────────────────────────────── */

    const onUndo = (): void => doUndo();
    undoBtn?.addEventListener("click", onUndo);
    cleanups.push(() => undoBtn?.removeEventListener("click", onUndo));

    const onClear = (): void => {
      run("clear");
    };
    clearBtn?.addEventListener("click", onClear);
    cleanups.push(() => clearBtn?.removeEventListener("click", onClear));

    const specMarkdown = (): string => {
      const label = (id: string): string => graph.nodes.find((n) => n.id === id)?.label ?? id;
      const lines = ["# System design (built with recite)", "", "## Services"];
      for (const node of graph.nodes) lines.push(`- ${node.label}`);
      if (graph.edges.length) {
        lines.push("", "## Connections");
        for (const edge of graph.edges) lines.push(`- ${label(edge.from)} → ${label(edge.to)}`);
      }
      lines.push("", "> Hand this to your agent and build it.");
      return lines.join("\n");
    };

    const specJson = (): string => {
      const label = (id: string): string => graph.nodes.find((n) => n.id === id)?.label ?? id;
      return JSON.stringify(
        {
          tool: "recite",
          nodes: graph.nodes.map((n) => n.label),
          edges: graph.edges.map((e) => ({ from: label(e.from), to: label(e.to) })),
        },
        null,
        2,
      );
    };

    const copy = (text: string, what: string): void => {
      navigator.clipboard.writeText(text).then(
        () => setFeedback(`✓ ${what} copied — paste it to your agent`),
        () => setFeedback("✗ clipboard blocked — select and copy manually", true),
      );
    };

    const onCopyMd = (): void => copy(specMarkdown(), "spec");
    const onCopyJson = (): void => copy(specJson(), "json");
    mdBtn?.addEventListener("click", onCopyMd);
    jsonBtn?.addEventListener("click", onCopyJson);
    cleanups.push(() => mdBtn?.removeEventListener("click", onCopyMd));
    cleanups.push(() => jsonBtn?.removeEventListener("click", onCopyJson));

    /* ── go ──────────────────────────────────────────────────────────────── */

    refresh();
    renderLog();
    cleanups.push(enterPage(root));
    cleanups.push(scrollReveal(root));
    cleanups.push(() => canvas?.destroy());
    return () => cleanups.forEach((fn) => fn());
  },
};
