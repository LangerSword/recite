/**
 * The studio canvas: an SVG diagram that draws as commands land. Nodes pop,
 * edges draw themselves, positions tween between layouts. Olive-theme aware
 * via the page's CSS variables; reduced-motion gets instant states.
 */

import { gsap } from "gsap";
import { EASE, prefersReducedMotion } from "../lib/motion";
import { layoutGraph, NODE_H, type Placed } from "./layout";
import type { ApplyMeta, StudioGraph } from "./graph";

const NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

interface NodeRec {
  g: SVGGElement;
  rect: SVGRectElement;
  text: SVGTextElement;
  pos: { x: number; y: number };
  w: number;
}

interface EdgeRec {
  path: SVGPathElement;
  from: string;
  to: string;
}

export class StudioCanvas {
  private svg: SVGSVGElement;
  private edgeLayer: SVGGElement;
  private nodeLayer: SVGGElement;
  private nodes = new Map<string, NodeRec>();
  private edges = new Map<string, EdgeRec>();
  private reduced = prefersReducedMotion();

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    svg.replaceChildren();
    const defs = el("defs", {});
    const marker = el("marker", {
      id: "sc-arrow",
      viewBox: "0 0 6 6",
      refX: 5.2,
      refY: 3,
      markerWidth: 6.5,
      markerHeight: 6.5,
      orient: "auto-start-reverse",
    });
    marker.appendChild(el("path", { d: "M0,0 L6,3 L0,6 z", class: "sc-arrow-head" }));
    defs.appendChild(marker);
    this.edgeLayer = el("g", { class: "sc-edges" });
    this.nodeLayer = el("g", { class: "sc-nodes" });
    svg.append(defs, this.edgeLayer, this.nodeLayer);
  }

  sync(graph: StudioGraph, meta: ApplyMeta | null, animateOverride?: boolean): void {
    const { pos, width, height } = layoutGraph(graph.nodes, graph.edges);
    const animate = animateOverride ?? (!this.reduced && this.nodes.size > 0);

    if (meta) {
      for (const id of meta.removedNodeIds) {
        const rec = this.nodes.get(id);
        if (!rec) continue;
        this.nodes.delete(id);
        if (animate) {
          gsap.to(rec.g, {
            opacity: 0,
            scale: 0.9,
            transformOrigin: "50% 50%",
            duration: 0.28,
            ease: "power2.in",
            onComplete: () => rec.g.remove(),
          });
        } else {
          rec.g.remove();
        }
      }
      for (const id of meta.removedEdgeIds) {
        const rec = this.edges.get(id);
        if (!rec) continue;
        this.edges.delete(id);
        if (animate) {
          gsap.to(rec.path, { opacity: 0, duration: 0.22, onComplete: () => rec.path.remove() });
        } else {
          rec.path.remove();
        }
      }
    } else {
      for (const rec of this.nodes.values()) rec.g.remove();
      this.nodes.clear();
      for (const rec of this.edges.values()) rec.path.remove();
      this.edges.clear();
    }

    for (const node of graph.nodes) {
      const target = pos.get(node.id);
      if (!target) continue;
      let rec = this.nodes.get(node.id);
      if (!rec) {
        const g = el("g", { class: "sc-node" });
        const rect = el("rect", { rx: 11 });
        const text = el("text", {});
        text.textContent = node.label;
        g.append(rect, text);
        this.nodeLayer.appendChild(g);
        rec = { g, rect, text, pos: { x: target.x, y: target.y }, w: target.w };
        this.nodes.set(node.id, rec);
        this.applyNode(rec, target);
        if (animate) {
          gsap.fromTo(
            g,
            { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" },
            { opacity: 1, scale: 1, duration: 0.5, ease: EASE.pop, transformOrigin: "50% 50%" },
          );
        }
      } else {
        if (rec.text.textContent !== node.label) rec.text.textContent = node.label;
        rec.rect.setAttribute("width", String(target.w));
        rec.w = target.w;
        if (animate && (rec.pos.x !== target.x || rec.pos.y !== target.y)) {
          gsap.to(rec.pos, {
            x: target.x,
            y: target.y,
            duration: 0.55,
            ease: EASE.out,
            onUpdate: () => this.paint(),
          });
        } else {
          rec.pos.x = target.x;
          rec.pos.y = target.y;
        }
      }
    }

    for (const edge of graph.edges) {
      if (this.edges.has(edge.id)) continue;
      const path = el("path", {
        class: "sc-edge",
        "marker-end": "url(#sc-arrow)",
        pathLength: 1,
      });
      this.edgeLayer.appendChild(path);
      this.edges.set(edge.id, { path, from: edge.from, to: edge.to });
      if (animate) {
        gsap.fromTo(
          path,
          { opacity: 0, strokeDashoffset: 1 },
          { opacity: 1, strokeDashoffset: 0, duration: 0.55, ease: EASE.draw },
        );
      }
    }

    this.svg.setAttribute("viewBox", `0 0 ${Math.max(width, 260)} ${Math.max(height, 180)}`);
    this.paint();
    this.svg.setAttribute(
      "aria-label",
      `Diagram: ${graph.nodes.length} nodes, ${graph.edges.length} connections`,
    );
  }

  private applyNode(rec: NodeRec, placed: Placed): void {
    rec.rect.setAttribute("x", "0");
    rec.rect.setAttribute("y", "0");
    rec.rect.setAttribute("width", String(placed.w));
    rec.rect.setAttribute("height", String(NODE_H));
    rec.text.setAttribute("x", "14");
    rec.text.setAttribute("y", String(NODE_H / 2 + 4.5));
    rec.g.setAttribute("transform", `translate(${placed.x}, ${placed.y})`);
  }

  private paint(): void {
    for (const rec of this.nodes.values()) {
      rec.g.setAttribute("transform", `translate(${rec.pos.x}, ${rec.pos.y})`);
    }
    for (const rec of this.edges.values()) {
      const a = this.nodes.get(rec.from);
      const b = this.nodes.get(rec.to);
      if (!a || !b) continue;
      const ax = a.pos.x + a.w;
      const ay = a.pos.y + NODE_H / 2;
      const bx = b.pos.x;
      const by = b.pos.y + NODE_H / 2;
      const dx = Math.max(40, Math.abs(bx - ax) * 0.4);
      rec.path.setAttribute("d", `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`);
    }
  }

  destroy(): void {
    for (const rec of this.nodes.values()) {
      gsap.killTweensOf(rec.g);
      gsap.killTweensOf(rec.pos);
      rec.g.remove();
    }
    this.nodes.clear();
    for (const rec of this.edges.values()) {
      gsap.killTweensOf(rec.path);
      rec.path.remove();
    }
    this.edges.clear();
  }
}
