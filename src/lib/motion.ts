import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** True when the visitor asked their OS for reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Shared easing vocabulary so every page moves the same way. */
export const EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
  pop: "back.out(1.6)",
  draw: "power2.inOut",
} as const;

/**
 * Entrance for a freshly rendered page: direct children of `.page` rise in
 * on a short stagger. Returns a cleanup that reverts the tween.
 */
export function enterPage(root: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {};
  const targets = gsap.utils.toArray<HTMLElement>(root.querySelectorAll(".page > *"));
  if (targets.length === 0) return () => {};
  const tween = gsap.from(targets, {
    y: 14,
    autoAlpha: 0,
    duration: 0.65,
    ease: EASE.out,
    stagger: 0.06,
    clearProps: "transform,visibility,opacity",
  });
  return () => tween.kill();
}

/**
 * Scroll-driven reveals for `[data-reveal]` elements: each batch rises in
 * the first time it crosses into view. Reverting kills every trigger.
 */
export function scrollReveal(root: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {};
  const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-reveal]"));
  if (items.length === 0) return () => {};
  const ctx = gsap.context(() => {
    ScrollTrigger.batch(items, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.fromTo(
          batch,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: EASE.out,
            stagger: 0.08,
            overwrite: true,
            clearProps: "transform,visibility,opacity",
          },
        ),
    });
  }, root);
  return () => ctx.revert();
}
