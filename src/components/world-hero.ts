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
 * controls are retargeted to recite's routes, and the transformation panel's
 * timeline runs on GSAP over the framed DOM. Everything reverts on unmount.
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
  let startCall: gsap.core.Tween | null = null;

  const startWhenReady = (): void => {
    let started = false;
    const kick = (): void => {
      if (started) return;
      started = true;
      startCall = gsap.delayedCall(1.9, () => demo?.start());
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

  if (demo) {
    startWhenReady();
    cleanups.push(() => demo.destroy());
  }

  // Debug handle (also used by the CDP verification script).
  const debugHost = window as unknown as { __reciteWorld?: unknown };
  debugHost.__reciteWorld = {
    demoFound: Boolean(demo),
    start: () => demo?.start(),
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
