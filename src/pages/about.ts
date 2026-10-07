export default {
  title: "recite: about",

  render(): string {
    return `
      <section class="page">
        <p class="eyebrow">About</p>
        <h1>Design it by voice. Build it by voice. <em>Hear how it was made.</em></h1>

        <div class="prose">
          <p>
            recite is a voice-native studio in two halves. <strong>Studio</strong>
            turns speech into a diagram: speak a system, watch it draw itself,
            refine by voice. <strong>Record</strong> keeps the build that made
            it: the real audio sitting next to the commits it produced, so
            every change has a voice behind it.
          </p>
          <p>
            The first record is its own. This site is being designed and built
            entirely by voice. Every session is dictated and committed as it
            happens; no product code is typed by hand.
          </p>
          <p>
            Built for the <strong>Hacker House Goa 2026 × Wispr Flow</strong>
            build task. Any dictation works; this build runs on Wispr Flow.
          </p>
        </div>

        <dl class="facts">
          <div>
            <dt>Stack</dt>
            <dd>Vite + TypeScript, no framework. A static site, no backend.</dd>
          </div>
          <div>
            <dt>Method</dt>
            <dd>Product code enters the repo only through voice sessions.</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>Audio and commits extracted from the build itself.</dd>
          </div>
        </dl>
      </section>
    `;
  },
};
