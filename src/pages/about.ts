import { scrollReveal } from "../lib/motion";
import { mountWorldHero } from "../components/world-hero";

export default {
  title: "sayshell: about",

  render(): string {
    return `
      <section class="world" data-world aria-label="sayshell: the living hero"></section>

      <section class="page" id="story">
        <p class="eyebrow">About</p>
        <h1>Say it. Check it. <em>Then run it.</em></h1>

        <div class="prose">
          <p data-reveal>
            sayshell is a shell front end. You dictate a command with Wispr
            Flow, or type one. sayshell parses the command, lists what it
            will change, and asks you to confirm before anything destructive
            runs. Every run writes a receipt.
          </p>
          <p data-reveal>
            The gate uses bashlex, a shell parser, to read the command as a
            tree. It checks the tree for dangerous patterns: recursive deletes,
            force pushes, database drops, secret exposure, and more. It allows
            read-only commands. It asks for confirmation on anything else.
          </p>
          <p data-reveal>
            Built for the <strong>Hacker House Goa 2026 × Wispr Flow</strong>
            build task. Any dictation works; this build runs on Wispr Flow.
          </p>
        </div>

        <dl class="facts">
          <div data-reveal>
            <dt>Input</dt>
            <dd>Wispr Flow dictation, or typed text. No API key needed.</dd>
          </div>
          <div data-reveal>
            <dt>Gate</dt>
            <dd>Allow, ask, or block. Checks the command, not the intent.</dd>
          </div>
          <div data-reveal>
            <dt>Receipt</dt>
            <dd>Every run logged locally. No cloud, no account.</dd>
          </div>
        </dl>
      </section>
    `;
  },

  mount(root: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];
    const world = root.querySelector<HTMLElement>("[data-world]");
    if (world) cleanups.push(mountWorldHero(world));
    const reveal = scrollReveal(root);
    return () => {
      cleanups.forEach((fn) => fn());
      if (typeof reveal === "function") reveal();
    };
  },
};
