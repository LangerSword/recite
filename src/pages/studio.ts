const EXAMPLES = [
  "add payments api",
  "connect payments api to postgres",
  "remove payments api",
];

export default {
  title: "recite — speak your system",

  render(): string {
    return `
      <section class="page">
        <p class="eyebrow">The voice-native studio</p>
        <h1>Speak your system. <em>Watch it draw itself.</em></h1>
        <p class="lede">
          Commands become nodes and edges — then a history you can undo, an
          export, and a record of every session that made it.
        </p>

        <div class="speak">
          <textarea
            id="speak"
            rows="2"
            autofocus
            spellcheck="false"
            autocomplete="off"
            placeholder="Speak. Commands land here."
          ></textarea>
        </div>

        <p class="say-row">
          <span class="say-label">say</span>
          ${EXAMPLES.map((example) => `<span class="say">${example}</span>`).join("")}
        </p>

        <p class="note">
          session 001 — scaffold. The canvas, parser and undo arrive as this
          build goes on.
        </p>
      </section>
    `;
  },

  mount(root: HTMLElement): void {
    root.querySelector<HTMLTextAreaElement>("#speak")?.focus();
  },
};
