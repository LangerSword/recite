/**
 * The Flow bridge: reads a user's local Wispr Flow database (flow.sqlite)
 * entirely in the browser.
 *
 * Flow ships no web portal for your history and no third-party sign-in, so
 * recite goes to the source instead: the file itself, parsed locally with
 * sql.js, never uploaded, no account needed.
 */

export interface FlowSession {
  rowid: number;
  text: string;
  app: string;
  timestamp: string;
  duration: number;
  numWords: number;
  audio?: Uint8Array;
}

export interface FlowPair {
  raw: string;
  refined: string;
}

export interface FlowSummary {
  totalSessions: number;
  totalWords: number;
  avgDuration: number;
  audioCount: number;
  apps: Array<{ name: string; count: number }>;
  polish: FlowPair[];
  sessions: FlowSession[];
}

/* Minimal sql.js surface — we use a sliver of the library, so we type a
   sliver of it instead of pulling in the whole type package. */
type SqlValue = number | string | Uint8Array | null;

interface SqlStatement {
  step(): boolean;
  getAsObject(): Record<string, SqlValue>;
  free(): void;
}

interface SqlDatabase {
  exec(sql: string): Array<{ columns: string[]; values: SqlValue[][] }>;
  prepare(sql: string): SqlStatement;
  close(): void;
}

export interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlDatabase;
}

type SqlJsInit = (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;

declare global {
  interface Window {
    initSqlJs?: SqlJsInit;
  }
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

/** Load sql.js lazily — only the connect page pays for it. */
export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = new Promise<SqlJsStatic>((resolve, reject) => {
      const boot = (): void => {
        const init = window.initSqlJs;
        if (!init) {
          reject(new Error("the sql.js runtime failed to initialise"));
          return;
        }
        init({ locateFile: (file) => `/vendor/sqljs/${file}` }).then(resolve, reject);
      };
      if (window.initSqlJs) {
        boot();
        return;
      }
      const script = document.createElement("script");
      script.src = "/vendor/sqljs/sql-wasm.js";
      script.onload = boot;
      script.onerror = () => reject(new Error("the sql.js runtime failed to load"));
      document.head.appendChild(script);
    });
  }
  return sqlPromise;
}

const asText = (v: SqlValue): string => (typeof v === "string" ? v : "");
const asNumber = (v: SqlValue): number => (typeof v === "number" ? v : 0);

export function readFlowDb(SQL: SqlJsStatic, bytes: Uint8Array, audioLimit = 6): FlowSummary {
  const db = new SQL.Database(bytes);
  try {
    const hasTable = (name: string): boolean => {
      const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
      return result.length > 0 && result[0].values.length > 0;
    };
    if (!hasTable("History")) {
      throw new Error("no History table — that doesn't look like a Wispr Flow database");
    }

    const totals = db.exec(
      `SELECT COUNT(*) AS n, SUM(numWords) AS words, AVG(duration) AS avg,
              SUM(CASE WHEN audio IS NOT NULL THEN 1 ELSE 0 END) AS clips
       FROM History`,
    );
    const [n, words, avg, clips] = totals.length
      ? (totals[0].values[0] as SqlValue[])
      : ([0, 0, 0, 0] as SqlValue[]);

    const apps: Array<{ name: string; count: number }> = [];
    const appsResult = db.exec(
      `SELECT app, COUNT(*) AS c FROM History
       WHERE app IS NOT NULL AND app != '' GROUP BY app ORDER BY c DESC LIMIT 6`,
    );
    if (appsResult.length) {
      for (const row of appsResult[0].values) {
        apps.push({ name: asText(row[0]), count: asNumber(row[1]) });
      }
    }

    const sessions: FlowSession[] = [];
    const stmt = db.prepare(
      `SELECT rowid, asrText, formattedText, app, timestamp, duration, numWords
       FROM History ORDER BY timestamp DESC LIMIT 60`,
    );
    while (stmt.step()) {
      const row = stmt.getAsObject();
      sessions.push({
        rowid: asNumber(row.rowid),
        text: asText(row.formattedText) || asText(row.asrText),
        app: asText(row.app),
        timestamp: asText(row.timestamp),
        duration: asNumber(row.duration),
        numWords: asNumber(row.numWords),
      });
    }
    stmt.free();

    // Audio: Flow stores WAV clips in the History table; grab the newest few.
    const audioStmt = db.prepare(
      `SELECT rowid, audio FROM History
       WHERE audio IS NOT NULL ORDER BY timestamp DESC LIMIT ${audioLimit}`,
    );
    const byRow = new Map<number, Uint8Array>();
    while (audioStmt.step()) {
      const row = audioStmt.getAsObject();
      const blob = row.audio;
      if (blob instanceof Uint8Array) byRow.set(asNumber(row.rowid), blob);
    }
    audioStmt.free();
    for (const session of sessions) {
      const clip = byRow.get(session.rowid);
      if (clip) session.audio = clip;
    }

    const polish: FlowPair[] = [];
    if (hasTable("Polish")) {
      const polishResult = db.exec(
        `SELECT polishInitialText, polishedText FROM Polish
         WHERE polishInitialText IS NOT NULL AND polishedText IS NOT NULL
         ORDER BY id DESC LIMIT 6`,
      );
      if (polishResult.length) {
        for (const row of polishResult[0].values) {
          polish.push({ raw: asText(row[0]), refined: asText(row[1]) });
        }
      }
    }

    return {
      totalSessions: asNumber(n),
      totalWords: asNumber(words),
      avgDuration: asNumber(avg),
      audioCount: asNumber(clips),
      apps,
      polish,
      sessions,
    };
  } finally {
    db.close();
  }
}

/** "2026-10-07 18:58:40.645 +00:00" → a Date (UTC). */
export function parseFlowTimestamp(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
}
