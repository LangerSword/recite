import { gsap } from "gsap";

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
