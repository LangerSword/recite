import { scrollReveal } from "../lib/motion";
import {
  loadSqlJs,
  readFlowDb,
  parseFlowTimestamp,
  type FlowSummary,
} from "../lib/flow-bridge";

const OS_PATHS: Array<[string, string]> = [
  ["macOS", "~/Library/Application Support/Wispr Flow/flow.sqlite"],
  ["Windows", "%APPDATA%\\Wispr Flow\\flow.sqlite"],
  ["Linux", "~/.config/Wispr Flow/flow.sqlite"],
];

export default {
  title: "recite: connect your Flow",

  render(): string {
    return `
      <section class="page">
        <p class="eyebrow">The bridge</p>
        <h1>Your Flow, <em>on the web.</em></h1>
        <p class="lede">
          Wispr Flow keeps every dictation in a local database and has no web
          view of it. recite reads that file in your browser instead — the
          words come straight from your machine, and nothing is uploaded.
        </p>

        <ol class="bridge-steps">
          <li><b>1</b> · Find your Flow database: ${OS_PATHS.map(
            ([os, path]) => `<br><span class="bridge-os">${os}</span> <code>${path}</code>`,
          ).join("")}</li>
          <li><b>2</b> · Drop it below. It is parsed in this tab and forgotten when you close it.</li>
          <li><b>3</b> · Quit Flow first and every last dictation is already in the file.</li>
        </ol>

        <div class="drop-zone" id="flow-zone" role="button" tabindex="0"
             aria-label="Choose or drop your flow.sqlite file">
          <div>
            <strong>Drop flow.sqlite here</strong>
            <span>or click to choose · parsed locally · never uploaded</span>
          </div>
          <input id="flow-file" type="file" hidden
                 accept=".sqlite,.sqlite3,.db,application/vnd.sqlite3,application/octet-stream">
        </div>
        <p class="bridge-status" id="flow-status" role="status" aria-live="polite"></p>

        <div class="bridge-results" id="flow-results" hidden></div>

        <p class="note">
          The honest bridge: Flow ships no third-party sign-in and no web portal
          for your history, so recite goes to the source — your own file, your
          own browser, no account needed.
        </p>
      </section>
    `;
  },

  mount(root: HTMLElement): () => void {
    const zone = root.querySelector<HTMLElement>("#flow-zone");
    const input = root.querySelector<HTMLInputElement>("#flow-file");
    const status = root.querySelector<HTMLElement>("#flow-status");
    const results = root.querySelector<HTMLElement>("#flow-results");
    const urls: string[] = [];

    const setStatus = (text: string, error = false): void => {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle("is-error", error);
    };

    const handleFile = async (file: File): Promise<void> => {
      if (!zone || !results) return;
      zone.classList.add("is-busy");
      setStatus(`reading ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const SQL = await loadSqlJs();
        const summary = readFlowDb(SQL, bytes);
        renderResults(results, summary, urls);
        setStatus(
          `${summary.totalSessions} sessions read — all of it stayed in this tab.`,
        );
      } catch (error) {
        setStatus(
          error instanceof Error ? `✗ ${error.message}` : "✗ could not read that file",
          true,
        );
      } finally {
        zone.classList.remove("is-busy");
      }
    };

    zone?.addEventListener("click", () => input?.click());
    zone?.addEventListener("keydown", (event) => {
      const ev = event as KeyboardEvent;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        input?.click();
      }
    });
    input?.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) void handleFile(file);
    });
    zone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("is-over");
    });
    zone?.addEventListener("dragleave", () => zone.classList.remove("is-over"));
    zone?.addEventListener("drop", (event) => {
      const ev = event as DragEvent;
      ev.preventDefault();
      zone.classList.remove("is-over");
      const file = ev.dataTransfer?.files?.[0];
      if (file) void handleFile(file);
    });

    const cleanup = scrollReveal(root);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      cleanup();
    };
  },
};

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderResults(host: HTMLElement, s: FlowSummary, urls: string[]): void {
  host.hidden = false;
  host.replaceChildren();

  const stats = el("dl", "bridge-stats");
  const addStat = (label: string, value: string): void => {
    const box = el("div");
    box.appendChild(el("dt", undefined, label));
    box.appendChild(el("dd", undefined, value));
    stats.appendChild(box);
  };
  addStat("sessions", String(s.totalSessions));
  addStat("words", String(s.totalWords));
  addStat("avg length", `${s.avgDuration.toFixed(1)}s`);
  addStat("clips", String(s.audioCount));
  if (s.apps.length) {
    addStat("used in", s.apps.map((a) => `${a.name} ×${a.count}`).join(", "));
  }
  host.appendChild(stats);

  if (s.polish.length) {
    const wrap = el("div", "bridge-pairs");
    wrap.appendChild(el("p", "say-label", "raw → refined, from your own history"));
    for (const pair of s.polish) {
      const card = el("div", "bridge-pair");
      card.appendChild(el("p", "bridge-raw", pair.raw));
      card.appendChild(el("p", "bridge-refined", pair.refined));
      wrap.appendChild(card);
    }
    host.appendChild(wrap);
  }

  const list = el("div", "bridge-sessions");
  list.appendChild(el("p", "say-label", "the latest dictations"));
  for (const session of s.sessions.slice(0, 12)) {
    const card = el("div", "bridge-session");
    const head = el("header");
    const when = parseFlowTimestamp(session.timestamp);
    head.appendChild(
      el(
        "span",
        undefined,
        when
          ? when.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : session.timestamp,
      ),
    );
    if (session.app) head.appendChild(el("span", undefined, session.app));
    head.appendChild(
      el("span", undefined, `${session.numWords} words · ${session.duration.toFixed(1)}s`),
    );
    card.appendChild(head);
    card.appendChild(el("p", undefined, session.text || "(no text)"));

    if (session.audio) {
      const copy = new Uint8Array(session.audio);
      const url = URL.createObjectURL(new Blob([copy.buffer as ArrayBuffer], { type: "audio/wav" }));
      urls.push(url);
      const audio = el("audio") as HTMLAudioElement;
      audio.controls = true;
      audio.preload = "metadata";
      audio.src = url;
      card.appendChild(audio);
    }
    list.appendChild(card);
  }
  host.appendChild(list);
}
