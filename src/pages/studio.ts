import { enterPage } from "../lib/motion";
import { mountDiagramDemo } from "../components/diagram-demo";

const EXAMPLES = [
  "add payments api",
  "connect payments api to postgres",
  "remove payments api",
];

export default {
  title: "recite: speak your system",

  render(): string {
    return `
      <section class="page page--studio">
        <div class="hero">
          <div class="hero-copy">
            <p class="eyebrow">The voice-native studio</p>
            <h1>Speak your system. <em>Watch it draw itself.</em></h1>
            <p class="lede">
              Commands become nodes and edges, with undo, export, and a record
              of how it was all built.
            </p>

            <div class="speak">
              <label class="visually-hidden" for="speak">Speak a command</label>
              <textarea
                id="speak"
                rows="2"
                spellcheck="false"
                autocomplete="off"
                placeholder="Speak. Commands land here."
              ></textarea>
            </div>

            <div class="say-row">
              <span class="say-label">say</span>
              <div class="say-chips">
                ${EXAMPLES.map(
                  (example) =>
                    `<button class="say" type="button" data-say="${example}">${example}</button>`,
                ).join("")}
              </div>
            </div>
          </div>

          <div class="hero-demo" data-demo aria-label="Preview: spoken commands drawing a diagram"></div>
        </div>

        <p class="note">
          Built in the open, session by session. The canvas, parser and undo arrive next.
        </p>
      </section>
    `;
  },

  mount(root: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];

    const demo = root.querySelector<HTMLElement>("[data-demo]");
    if (demo) cleanups.push(mountDiagramDemo(demo));

    const input = root.querySelector<HTMLTextAreaElement>("#speak");
    root.querySelectorAll<HTMLButtonElement>(".say").forEach((chip) => {
      const handler = () => {
        if (!input) return;
        input.value = chip.dataset.say ?? "";
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      };
      chip.addEventListener("click", handler);
      cleanups.push(() => chip.removeEventListener("click", handler));
    });

    cleanups.push(enterPage(root));
    return () => cleanups.forEach((fn) => fn());
  },
};
