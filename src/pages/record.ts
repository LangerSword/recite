import { scrollReveal } from "../lib/motion";

export default {
  title: "sayshell: the build record",

  render(): string {
    return `
      <section class="page">
        <p class="eyebrow">The build record</p>
        <h1>Every session, <em>kept.</em></h1>
        <p class="lede">
          The actual audio, next to the commits it produced. Words and diffs
          on one timeline.
        </p>

        <div class="record-stage">
          <div class="record-rail" aria-hidden="true">
            <span class="rail-tick" data-reveal></span>
            <span class="rail-tick" data-reveal></span>
            <span class="rail-tick" data-reveal></span>
            <span class="rail-tick" data-reveal></span>
            <span class="rail-tick" data-reveal></span>
          </div>
          <div class="record-empty" data-reveal>
            <span class="pulse-dot" aria-hidden="true"></span>
            <p>The first record is this build’s own. Sessions land here as they happen.</p>
          </div>
          <p class="record-keys" aria-hidden="true" data-reveal>sessions, clips, commit cards</p>
        </div>

        <p class="note">
          The extractor turns dictated sessions and git history into this page.
          When it runs, this stage fills in.
        </p>
      </section>
    `;
  },

  mount(root: HTMLElement): () => void {
    return scrollReveal(root);
  },
};
