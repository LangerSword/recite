export default {
  title: "recite — the build record",

  render(): string {
    return `
      <section class="page">
        <p class="eyebrow">The build record</p>
        <h1>Every session, <em>kept.</em></h1>
        <p class="lede">
          The actual audio, next to the commits it produced — words and diffs
          on one timeline.
        </p>

        <div class="empty">
          <span class="pulse-dot" aria-hidden="true"></span>
          <p>No record yet — this page is generated from the build itself.</p>
        </div>

        <p class="note">
          sessions, clips and commit cards land here once the extractor runs.
        </p>
      </section>
    `;
  },
};
