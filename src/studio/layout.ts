/**
 * Auto-layout: rank nodes left to right by longest-path depth (capped so
 * cycles stay finite), stack each rank in insertion order, and return both
 * the placements and the drawing bounds. Deterministic: same graph in, same
 * picture out — which is what the record needs to replay sessions later.
 */

import type { StudioEdge, StudioNode } from "./graph";

export const NODE_H = 40;
export const NODE_MIN_W = 96;

export interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutResult {
  pos: Map<string, Placed>;
  width: number;
  height: number;
}

export function nodeWidth(label: string): number {
  return Math.max(NODE_MIN_W, Math.round(label.length * 7.6 + 30));
}

const PAD = 28;
const GAP_X = 90;
const GAP_Y = 26;

export function layoutGraph(nodes: StudioNode[], edges: StudioEdge[]): LayoutResult {
  const pos = new Map<string, Placed>();
  if (nodes.length === 0) return { pos, width: 520, height: 260 };

  const rank = new Map<string, number>();
  for (const n of nodes) rank.set(n.id, 0);
  for (const e of edges) rank.set(e.to, 1);
  // longest-path relaxation, capped passes so cycles terminate
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const e of edges) {
      const rf = rank.get(e.from) ?? 0;
      const rt = rank.get(e.to) ?? 0;
      if (rt < rf + 1) {
        rank.set(e.to, rf + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const byRank = new Map<number, StudioNode[]>();
  for (const n of nodes) {
    const r = rank.get(n.id) ?? 0;
    const list = byRank.get(r);
    if (list) list.push(n);
    else byRank.set(r, [n]);
  }
  const ranks = [...byRank.keys()].sort((a, b) => a - b);

  const colWidth = new Map<number, number>();
  const colHeight = new Map<number, number>();
  for (const r of ranks) {
    const list = byRank.get(r) ?? [];
    colWidth.set(r, Math.max(...list.map((n) => nodeWidth(n.label))));
    colHeight.set(r, list.length * NODE_H + Math.max(0, list.length - 1) * GAP_Y);
  }
  const maxH = Math.max(...ranks.map((r) => colHeight.get(r) ?? 0));

  let x = PAD;
  for (const r of ranks) {
    const list = byRank.get(r) ?? [];
    const w = colWidth.get(r) ?? NODE_MIN_W;
    const h = colHeight.get(r) ?? 0;
    const top = PAD + (maxH - h) / 2;
    list.forEach((node, i) => {
      pos.set(node.id, {
        x,
        y: top + i * (NODE_H + GAP_Y),
        w: nodeWidth(node.label),
        h: NODE_H,
      });
    });
    x += w + GAP_X;
  }

  return {
    pos,
    width: x - GAP_X + PAD,
    height: PAD * 2 + maxH,
  };
}
