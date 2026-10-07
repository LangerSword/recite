import { gsap } from "gsap";
import { EASE, prefersReducedMotion } from "../lib/motion";

/**
 * The studio hero demo: a small, honest animation of the product itself.
 * One spoken command at a time, typed into a prompt line, and the diagram
 * answers: a node pops, the next node pops, the edge draws between them.
 * Motion is storytelling (speech in, diagram out), never decoration.
 */
export function mountDiagramDemo(root: HTMLElement): () => void {
  // Static, in-repo markup only. No user input ever reaches innerHTML here.
  root.innerHTML = `
    <div class="demo-screen" aria-hidden="true">
      <p class="demo-line"><span class="demo-text"></span><span class="demo-caret"></span></p>
      <svg class="demo-canvas" viewBox="0 0 340 240" role="presentation">
        <defs>
          <marker id="demo-arrow" viewBox="0 0 6 6" refX="5.2" refY="3"
                  markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" class="demo-arrow-head" />
          </marker>
        </defs>
        <path class="demo-edge" data-edge="ab" pathLength="1"
              d="M166,49 C214,49 126,141 174,141" marker-end="url(#demo-arrow)" style="opacity:0" />
        <g class="demo-node" data-node="a" style="opacity:0">
          <rect x="16" y="26" width="150" height="46" rx="12" />
          <text x="34" y="54">payments api</text>
        </g>
        <g class="demo-node" data-node="b" style="opacity:0">
          <rect x="174" y="118" width="150" height="46" rx="12" />
          <text x="192" y="146">postgres</text>
        </g>
      </svg>
    </div>
    <div class="demo-foot">
      <span class="demo-cap">speech in, diagram out</span>
      <button class="demo-replay" type="button">replay</button>
    </div>
  `;

  const textEl = root.querySelector<HTMLElement>(".demo-text");
  const nodeA = root.querySelector<SVGGElement>('[data-node="a"]');
  const nodeB = root.querySelector<SVGGElement>('[data-node="b"]');
  const edge = root.querySelector<SVGPathElement>('[data-edge="ab"]');
  const replay = root.querySelector<HTMLButtonElement>(".demo-replay");
  if (!textEl || !nodeA || !nodeB || !edge || !replay) return () => {};

  const type = (line: string): gsap.core.Tween => {
    const s = { n: 0 };
    return gsap.to(s, {
      n: line.length,
      duration: line.length * 0.05,
      ease: "none",
      onUpdate: () => {
        textEl.textContent = line.slice(0, Math.round(s.n));
      },
    });
  };

  const pop = (el: SVGGElement): gsap.core.Tween =>
    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, duration: 0.5, ease: EASE.pop, transformOrigin: "50% 50%" },
    );

  const draw = (el: SVGPathElement): gsap.core.Tween =>
    gsap.fromTo(
      el,
      { opacity: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.6, ease: EASE.draw },
    );

  const tl = gsap.timeline({ paused: true });
  tl.add(type("add payments api"))
    .add(pop(nodeA), "-=0.05")
    .add(type("add postgres as database"), "+=0.55")
    .add(pop(nodeB), "-=0.05")
    .add(type("connect payments api to postgres"), "+=0.55")
    .add(draw(edge), "-=0.1");

  const settle = () => {
    textEl.textContent = "connect payments api to postgres";
    gsap.set([nodeA, nodeB], { opacity: 1, scale: 1 });
    gsap.set(edge, { opacity: 1, strokeDashoffset: 0 });
  };

  let kickoff: gsap.core.Tween | null = null;
  if (prefersReducedMotion()) {
    settle();
  } else {
    kickoff = gsap.delayedCall(0.55, () => tl.play());
  }

  const onReplay = () => {
    if (prefersReducedMotion()) return;
    tl.restart();
  };
  replay.addEventListener("click", onReplay);

  return () => {
    replay.removeEventListener("click", onReplay);
    kickoff?.kill();
    tl.kill();
  };
}
