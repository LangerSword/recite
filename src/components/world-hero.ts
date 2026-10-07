import { gsap } from "gsap";
import { EASE, prefersReducedMotion } from "../lib/motion";

const WORLD_URL = "/landing-pages/recite-world.html";

const FRAME_SANDBOX =
  "allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox";

function supportsWebGL2(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2"));
  } catch {
    return false;
  }
}

function scrollToStudioTool(): void {
  const tool = document.getElementById("studio-tool");
  if (!tool) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  tool.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/**
 * The living world: the ThreeUI "Sylva — Living Green" document (served
 * byte-exact at /landing-pages/inner-green-3d.html, derived for recite at
 * /landing-pages/recite-world.html) framed as recite's hero.
 *
 * The frame is same-origin, so the app drives the world from here: dock and
 * controls are retargeted to recite's routes, the transformation panel's
 * timeline runs on GSAP over the framed DOM, and the word-ribbons (raw
 * speech on a faint arc, refined commands on the band) draw in and loop.
 * Everything reverts on unmount.
 */
export function mountWorldHero(root: HTMLElement): () => void {
  let teardown: (() => void) | null = null;
  let active = true;

  if (!supportsWebGL2()) {
    root.classList.add("world--fallback");
    return () => {};
  }

  const frame = document.createElement("iframe");
  frame.className = "world-frame";
  frame.src = WORLD_URL;
  frame.title = "recite: the living studio";
  frame.setAttribute("sandbox", FRAME_SANDBOX);
  frame.setAttribute("scrolling", "no");

  const handleLoad = () => {
    if (!active) return;
    teardown?.();
    teardown = wireWorld(frame);
  };

  frame.addEventListener("load", handleLoad);
  root.appendChild(frame);

  // Scroll seam: the world drifts a touch as it leaves the viewport.
  const seam =
    prefersReducedMotion() || !window.matchMedia("(min-width: 48rem)").matches
      ? null
      : gsap.to(root, {
          yPercent: -4,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
        });

  return () => {
    active = false;
    frame.removeEventListener("load", handleLoad);
    teardown?.();
    teardown = null;
    seam?.scrollTrigger?.kill();
    seam?.kill();
    frame.remove();
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   inside the frame
   ══════════════════════════════════════════════════════════════════════════ */

function wireWorld(frame: HTMLIFrameElement): () => void {
  const win = frame.contentWindow;
  const doc = frame.contentDocument ?? win?.document;
  if (!win || !doc) return () => {};

  const cleanups: Array<() => void> = [];
  const listen = (target: EventTarget, type: string, handler: EventListener): void => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };

  /* ── navigation: dock, pill, scroll cue ────────────────────────────────── */

  const go = (hash: string): void => {
    if (window.location.hash === hash) scrollToStudioTool();
    else window.location.hash = hash;
  };

  for (const item of doc.querySelectorAll<HTMLAnchorElement>(".dock-item")) {
    listen(item, "click", (event) => {
      const ev = event as MouseEvent;
      const label = (item.textContent ?? "").trim().toLowerCase();
      if (label.includes("github")) return; // real href, opens in a new tab
      ev.preventDefault();
      if (label.includes("record")) go("#/record");
      else if (label.includes("about")) go("#/about");
      else go("#/studio");
    });
  }

  const pill = doc.querySelector<HTMLButtonElement>(".liquid-button--explore");
  if (pill) listen(pill, "click", () => scrollToStudioTool());

  const scrollCue = doc.querySelector<HTMLAnchorElement>(".scroll");
  if (scrollCue) {
    listen(scrollCue, "click", (event) => {
      (event as MouseEvent).preventDefault();
      scrollToStudioTool();
    });
  }

  /* ── the transformation panel ──────────────────────────────────────────── */

  const demo = buildDemo(doc);
  const ribbons = buildRibbons(doc);
  let startCall: gsap.core.Tween | null = null;

  const startWhenReady = (): void => {
    let started = false;
    const kick = (): void => {
      if (started) return;
      started = true;
      startCall = gsap.delayedCall(1.9, () => {
        demo?.start();
        ribbons?.start();
      });
    };
    const poll = window.setInterval(() => {
      const ready =
        doc.body.classList.contains("is-ready") ||
        doc.documentElement.classList.contains("is-ready");
      if (ready) {
        window.clearInterval(poll);
        kick();
      }
    }, 120);
    const failSafe = window.setTimeout(() => {
      window.clearInterval(poll);
      kick();
    }, 5200);
    cleanups.push(() => {
      window.clearInterval(poll);
      window.clearTimeout(failSafe);
      startCall?.kill();
    });
  };

  if (demo || ribbons) {
    startWhenReady();
    if (demo) cleanups.push(() => demo.destroy());
    if (ribbons) cleanups.push(() => ribbons.destroy());
  }

  // Debug handle (also used by the CDP verification script).
  const debugHost = window as unknown as { __reciteWorld?: unknown };
  debugHost.__reciteWorld = {
    demoFound: Boolean(demo),
    ribbonFound: Boolean(ribbons),
    start: () => demo?.start(),
    ribbonX: () =>
      Array.from(doc.querySelectorAll(".wr-text")).map((el) => Number(el.getAttribute("x") ?? 0)),
    gsap,
  };
  cleanups.push(() => {
    delete debugHost.__reciteWorld;
  });

  return () => {
    for (const fn of cleanups) fn();
  };
}

/* ── the demo timeline ───────────────────────────────────────────────────── */

interface Demo {
  start: () => void;
  destroy: () => void;
}

function buildDemo(doc: Document): Demo | null {
  const panel = doc.getElementById("recite-panel");
  const raw = panel?.querySelector<HTMLElement>("[data-raw]");
  const state = panel?.querySelector<HTMLElement>("[data-state]");
  const replay = panel?.querySelector<HTMLButtonElement>(".rpanel-replay");
  const divider = panel?.querySelector<HTMLElement>("[data-divider]");
  const cmds = panel ? Array.from(panel.querySelectorAll<HTMLElement>("[data-cmd]")) : [];
  const fillers = panel ? Array.from(panel.querySelectorAll<HTMLElement>(".flr")) : [];
  const words = raw ? Array.from(raw.querySelectorAll<HTMLElement>(".w")) : [];
  const nodeA = panel?.querySelector<SVGGElement>('[data-node="a"]');
  const nodeB = panel?.querySelector<SVGGElement>('[data-node="b"]');
  const edge = panel?.querySelector<SVGPathElement>("[data-edge]");

  if (!panel || !raw || !state || !replay || !divider || !edge || !nodeA || !nodeB) return null;
  if (cmds.length < 2 || words.length < 5) return null;

  // Stagger the strike-through per filler through the CSS transition delay.
  fillers.forEach((filler, index) => {
    filler.style.setProperty("--fd", `${index * 95}ms`);
  });

  const pop = (el: SVGGElement): gsap.core.Tween =>
    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, duration: 0.5, ease: EASE.pop, transformOrigin: "50% 50%" },
    );

  const showFinal = (): void => {
    gsap.set(words, { opacity: 1, y: 0 });
    for (const filler of fillers) filler.classList.add("is-struck");
    gsap.set([divider, ...cmds], { opacity: 1, y: 0 });
    gsap.set([nodeA, nodeB], { opacity: 1, scale: 1 });
    gsap.set(edge, { opacity: 1, strokeDashoffset: 0 });
    state.textContent = "structured";
  };

  if (prefersReducedMotion()) {
    return { start: showFinal, destroy: () => {} };
  }

  const setState = (label: string): void => {
    state.textContent = label;
  };

  // Pre-start pose: commands and diagram stay out until the timeline runs.
  gsap.set(cmds, { opacity: 0, y: 8 });
  gsap.set([nodeA, nodeB], { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" });
  gsap.set(edge, { opacity: 0, strokeDashoffset: 1 });

  // Every replay starts from this snap-back: the resting pose after a cycle
  // is the final state, so the demo reads at rest and resets in one beat.
  const resetCycle = (): void => {
    setState("listening");
    for (const filler of fillers) filler.classList.remove("is-struck");
    raw.classList.remove("is-polishing");
    gsap.set(raw, { opacity: 1 });
    gsap.set(words, { opacity: 0, y: 6 });
    gsap.set(divider, { opacity: 0 });
    gsap.set(cmds, { opacity: 0, y: 8 });
    gsap.set([nodeA, nodeB], { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" });
    gsap.set(edge, { opacity: 0, strokeDashoffset: 1 });
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: EASE.out } });

  tl.call(resetCycle);
  tl.to(words, { opacity: 1, y: 0, duration: 0.3, stagger: 0.055 });
  tl.to({}, { duration: 0.5 });

  tl.call(() => {
    setState("refining");
    raw.classList.add("is-polishing");
  });
  tl.to({}, { duration: 1.15 });
  tl.call(() => raw.classList.remove("is-polishing"));
  tl.call(() => {
    for (const filler of fillers) filler.classList.add("is-struck");
  });
  tl.to(raw, { opacity: 0.55, duration: 0.55 }, "+=0.45");

  tl.to(divider, { opacity: 1, duration: 0.4 }, "+=0.1");
  tl.to(cmds[0], { opacity: 1, y: 0, duration: 0.42 }, "-=0.15");
  tl.add(pop(nodeA), "-=0.28");
  tl.to(cmds[1], { opacity: 1, y: 0, duration: 0.42 }, "+=0.55");
  tl.add(pop(nodeB), "-=0.28");
  tl.fromTo(
    edge,
    { opacity: 1, strokeDashoffset: 1 },
    { strokeDashoffset: 0, duration: 0.6, ease: EASE.draw },
    "-=0.2",
  );
  tl.call(() => setState("structured"));
  tl.to({}, { duration: 4.2 });

  let hovering = false;
  let loopCall: gsap.core.Tween | null = null;

  const scheduleLoop = (): void => {
    loopCall?.kill();
    loopCall = gsap.delayedCall(2.8, () => {
      if (hovering || doc.hidden) scheduleLoop();
      else tl.restart();
    });
  };
  tl.eventCallback("onComplete", scheduleLoop);

  const onReplay = (): void => {
    loopCall?.kill();
    tl.restart();
  };
  replay.addEventListener("click", onReplay);

  const onEnter = (): void => {
    hovering = true;
  };
  const onLeave = (): void => {
    hovering = false;
  };
  panel.addEventListener("pointerenter", onEnter);
  panel.addEventListener("pointerleave", onLeave);

  let pausedForVisibility = false;
  const onVisibility = (): void => {
    const hidden = doc.hidden || document.hidden;
    if (hidden) {
      loopCall?.pause();
      if (tl.isActive()) {
        pausedForVisibility = true;
        tl.pause();
      }
    } else {
      loopCall?.resume();
      if (pausedForVisibility) {
        pausedForVisibility = false;
        tl.resume();
      }
    }
  };
  doc.addEventListener("visibilitychange", onVisibility);

  return {
    start: () => {
      tl.play(0);
    },
    destroy: () => {
      loopCall?.kill();
      tl.kill();
      replay.removeEventListener("click", onReplay);
      panel.removeEventListener("pointerenter", onEnter);
      panel.removeEventListener("pointerleave", onLeave);
      doc.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

/* ── the word-ribbons ───────────────────────────────────────────────────── */

interface Ribbons {
  start: () => void;
  destroy: () => void;
}

function buildRibbons(doc: Document): Ribbons | null {
  const wrap = doc.getElementById("word-ribbons");
  if (!wrap) return null;
  const paths = Array.from(wrap.querySelectorAll<SVGPathElement>(".wr-path"));
  const texts = Array.from(wrap.querySelectorAll<SVGTextElement>(".wr-text"));
  const runs = Array.from(wrap.querySelectorAll<SVGTextPathElement>(".wr-run"));
  if (paths.length < 2 || texts.length < 2 || runs.length < 2) return null;

  const reduce = prefersReducedMotion();
  const tweens: gsap.core.Animation[] = [];
  let started = false;

  const start = (): void => {
    if (started) return;
    started = true;

    if (reduce) {
      gsap.set(paths, { strokeDashoffset: 0 });
      gsap.set(texts, { opacity: 1 });
      return;
    }

    // The paths draw themselves in like vines; the words follow.
    paths.forEach((path, index) => {
      tweens.push(
        gsap.fromTo(
          path,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            duration: 2.1 + index * 0.5,
            ease: EASE.draw,
            delay: 0.25 + index * 0.45,
          },
        ),
      );
    });
    tweens.push(gsap.to(texts, { opacity: 1, duration: 1.4, ease: "power1.out", delay: 1.1 }));

    const ready: Promise<unknown> = doc.fonts?.ready ?? Promise.resolve();
    void ready.then(() => {
      if (reduce) return;

      runs.forEach((run, index) => {
        const host = texts[index];
        const path = paths[index];
        if (!host || !path) return;

        // The raw stream is tspan segments (so every filler stays addressable);
        // the refined stream is plain text. Either way the unit is one full
        // copy of the stream, repeated until the path stays covered.
        const segs = Array.from(run.querySelectorAll<SVGElement>(".wr-seg"));
        const seed = segs.length ? segs.map((seg) => seg.cloneNode(true) as SVGElement) : null;
        const base = run.dataset.repeat ?? run.textContent ?? "";
        if (!seed && !base) return;

        const setCopies = (count: number): void => {
          if (seed) {
            const frag = doc.createDocumentFragment();
            for (let c = 0; c < count; c++) for (const seg of seed) frag.appendChild(seg.cloneNode(true));
            run.replaceChildren(frag);
          } else {
            run.textContent = base.repeat(count);
          }
        };

        // The loop period: measure one copy, then two — the delta between the
        // measurements is the distance between corresponding glyphs across the
        // seam, which is exactly what a seamless marquee needs.
        setCopies(1);
        const one = run.getComputedTextLength();
        setCopies(2);
        const period = run.getComputedTextLength() - one;
        if (period <= 0) return;

        // Enough copies that the path stays covered at every loop position.
        const copies = Math.max(2, Math.ceil(path.getTotalLength() / period) + 1);
        setCopies(copies);

        const speed = index === 0 ? 48 : 56; // stage units per second
        tweens.push(
          gsap.fromTo(
            host,
            { attr: { x: -period } },
            { attr: { x: 0 }, duration: period / speed, ease: "none", repeat: -1 },
          ),
        );
      });

      // The raw arc keeps showing the process: a strike wave runs through its
      // fillers (in stream order) every cycle, and the words brighten as they
      // settle — raw speech refining itself, on repeat.
      const rawHost = texts[0];
      const rawRun = runs[0];
      const rawSegs = rawRun ? Array.from(rawRun.querySelectorAll<SVGElement>(".wr-seg")) : [];
      if (rawHost && rawRun && rawSegs.length) {
        const bySeg = new Map<string, SVGElement[]>();
        for (const seg of rawSegs) {
          const key = seg.getAttribute("data-seg") ?? "";
          const list = bySeg.get(key);
          if (list) list.push(seg);
          else bySeg.set(key, [seg]);
        }
        const keys = [...bySeg.keys()].sort();
        const cycle = gsap.timeline({ repeat: -1 });
        cycle.call(() => {
          for (const filler of rawRun.querySelectorAll<SVGElement>(".flr")) {
            filler.classList.remove("is-struck");
            gsap.set(filler, { clearProps: "fill" });
          }
          gsap.set(rawHost, { fill: "rgba(255,255,255,0.44)" });
        });
        cycle.to({}, { duration: 4.2 });
        keys.forEach((key, i) => {
          cycle.call(
            () => {
              for (const seg of bySeg.get(key) ?? []) {
                for (const filler of seg.querySelectorAll<SVGElement>(".flr")) {
                  filler.classList.add("is-struck");
                  // a brief flash as the wave hits, then it settles dim —
                  // the refinement is an event you can see from across the page
                  gsap.fromTo(
                    filler,
                    { fill: "rgba(255,255,255,0.85)" },
                    { fill: "rgba(255,255,255,0.22)", duration: 0.6, ease: "power2.out", overwrite: "auto" },
                  );
                }
              }
            },
            undefined,
            4.2 + i * 0.55,
          );
        });
        cycle.to(rawHost, { fill: "rgba(255,255,255,0.56)", duration: 1.3, ease: "power1.out" }, 4.4);
        cycle.to({}, { duration: 6 });
        tweens.push(cycle);
      }
    });
  };

  return {
    start,
    destroy: () => {
      for (const tween of tweens) tween.kill();
      tweens.length = 0;
    },
  };
}
