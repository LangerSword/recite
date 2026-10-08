import { scrollReveal } from "../lib/motion";

export default {
  title: "sayshell: about",

  render(): string {
    return `
      <section class="page">
        <p class="eyebrow">About</p>
        <h1>Say it. Check it. <em>Then run it.</em></h1>

        <div class="prose">
          <p data-reveal>
            sayshell is a shell front end for dictated lines. You speak an
            intent. sayshell proposes a command. It lists the effect. It asks
            you to confirm before anything destructive runs. Every run writes
            a receipt.
          </p>
          <p data-reveal>
            The first record is its own. This site is being designed and built
            entirely by voice. Every session is dictated and committed as it
            happens; no product code is typed by hand.
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
    return scrollReveal(root);
  },
};
