export default {
  title: "recite: the build record",

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
            <span class="rail-tick"></span>
            <span class="rail-tick"></span>
            <span class="rail-tick"></span>
            <span class="rail-tick"></span>
            <span class="rail-tick"></span>
          </div>
          <div class="record-empty">
            <span class="pulse-dot" aria-hidden="true"></span>
            <p>The first record is this build’s own. Sessions land here as they happen.</p>
          </div>
          <p class="record-keys" aria-hidden="true">sessions, clips, commit cards</p>
        </div>

        <p class="note">
          The extractor turns dictated sessions and git history into this page.
          When it runs, this stage fills in.
        </p>
      </section>
    `;
  },
};
