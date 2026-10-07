/** The studio graph model: nodes, edges, and the pure ops that change them. */

export interface StudioNode {
  id: string;
  label: string;
  born: number;
}

export interface StudioEdge {
  id: string;
  from: string;
  to: string;
  born: number;
}

export interface StudioGraph {
  nodes: StudioNode[];
  edges: StudioEdge[];
  seq: number;
}

export type StudioOp =
  | { kind: "add"; label: string }
  | { kind: "connect"; a: string; b: string }
  | { kind: "remove"; label: string }
  | { kind: "rename"; from: string; to: string }
  | { kind: "clear" };

export interface ApplyMeta {
  addedNodes: string[];
  addedEdges: string[];
  removedNodeIds: string[];
  removedEdgeIds: string[];
  renamedNodeIds: string[];
}

export interface ApplyResult {
  graph: StudioGraph;
  meta: ApplyMeta;
  error?: string;
}

const emptyMeta = (): ApplyMeta => ({
  addedNodes: [],
  addedEdges: [],
  removedNodeIds: [],
  removedEdgeIds: [],
  renamedNodeIds: [],
});

export function emptyGraph(): StudioGraph {
  return { nodes: [], edges: [], seq: 0 };
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Find a node by exact label, falling back to a unique substring match in
 * either direction — so "connect payments to postgres" can resolve the node
 * "payments api" when the spoken form is shorter than the label.
 */
export function resolveNode(graph: StudioGraph, query: string): StudioNode | "ambiguous" | null {
  const q = norm(query);
  if (!q) return null;
  const exact = graph.nodes.find((n) => norm(n.label) === q);
  if (exact) return exact;
  const partial = graph.nodes.filter((n) => {
    const l = norm(n.label);
    return l.includes(q) || q.includes(l);
  });
  if (partial.length === 1) return partial[0];
  return partial.length > 1 ? "ambiguous" : null;
}

export function applyOp(graph: StudioGraph, op: StudioOp): ApplyResult {
  const next: StudioGraph = {
    nodes: [...graph.nodes],
    edges: [...graph.edges],
    seq: graph.seq,
  };
  const meta = emptyMeta();

  switch (op.kind) {
    case "add": {
      const label = op.label;
      if (next.nodes.some((n) => norm(n.label) === norm(label))) {
        return { graph, meta, error: `"${label}" is already on the canvas` };
      }
      const node: StudioNode = { id: `n${++next.seq}`, label, born: next.seq };
      next.nodes.push(node);
      meta.addedNodes.push(node.id);
      break;
    }
    case "connect": {
      const a = resolveNode(next, op.a);
      const b = resolveNode(next, op.b);
      if (a === "ambiguous" || b === "ambiguous") {
        return { graph, meta, error: "that name matches more than one node" };
      }
      if (!a || !b) {
        const missing = !a ? op.a : op.b;
        return { graph, meta, error: `no node called "${missing}"` };
      }
      if (a.id === b.id) {
        return { graph, meta, error: "a node cannot connect to itself" };
      }
      const dup = next.edges.some(
        (e) => (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id),
      );
      if (dup) {
        return { graph, meta, error: `"${a.label}" and "${b.label}" are already connected` };
      }
      const edge: StudioEdge = { id: `e${++next.seq}`, from: a.id, to: b.id, born: next.seq };
      next.edges.push(edge);
      meta.addedEdges.push(edge.id);
      break;
    }
    case "remove": {
      const node = resolveNode(next, op.label);
      if (node === "ambiguous") {
        return { graph, meta, error: "that name matches more than one node" };
      }
      if (!node) {
        return { graph, meta, error: `no node called "${op.label}"` };
      }
      meta.removedNodeIds.push(node.id);
      const attached = next.edges.filter((e) => e.from === node.id || e.to === node.id);
      meta.removedEdgeIds.push(...attached.map((e) => e.id));
      next.nodes = next.nodes.filter((n) => n.id !== node.id);
      next.edges = next.edges.filter((e) => e.from !== node.id && e.to !== node.id);
      break;
    }
    case "rename": {
      const node = resolveNode(next, op.from);
      if (node === "ambiguous") {
        return { graph, meta, error: "that name matches more than one node" };
      }
      if (!node) {
        return { graph, meta, error: `no node called "${op.from}"` };
      }
      if (next.nodes.some((n) => n.id !== node.id && norm(n.label) === norm(op.to))) {
        return { graph, meta, error: `"${op.to}" is already taken` };
      }
      next.nodes = next.nodes.map((n) => (n.id === node.id ? { ...n, label: op.to } : n));
      meta.renamedNodeIds.push(node.id);
      break;
    }
    case "clear": {
      meta.removedNodeIds.push(...next.nodes.map((n) => n.id));
      meta.removedEdgeIds.push(...next.edges.map((e) => e.id));
      next.nodes = [];
      next.edges = [];
      break;
    }
  }

  return { graph: next, meta };
}

/** A short human summary of an op, for the session log. */
export function summarize(op: StudioOp, graph: StudioGraph, meta: ApplyMeta): string {
  switch (op.kind) {
    case "add":
      return `add "${op.label}"`;
    case "connect": {
      const a = graph.nodes.find((n) => meta.addedEdges.length && graph.edges.find((e) => e.id === meta.addedEdges[0])?.from === n.id);
      const edge = meta.addedEdges.length ? graph.edges.find((e) => e.id === meta.addedEdges[0]) : undefined;
      if (edge) {
        const from = graph.nodes.find((n) => n.id === edge.from)?.label ?? op.a;
        const to = graph.nodes.find((n) => n.id === edge.to)?.label ?? op.b;
        return `connect "${from}" → "${to}"`;
      }
      return `connect "${op.a}" → "${op.b}"${a ? "" : ""}`;
    }
    case "remove":
      return `remove "${op.label}"`;
    case "rename":
      return `rename "${op.from}" → "${op.to}"`;
    case "clear":
      return "clear the canvas";
  }
}
