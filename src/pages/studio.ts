import { enterPage, scrollReveal } from "../lib/motion";
import { mountWorldHero } from "../components/world-hero";

const EXAMPLES = [
  "add payments api",
  "connect payments api to postgres",
  "remove payments api",
];

export default {
  title: "recite: speak your system",

  render(): string {
    return `
      <section class="world" data-world aria-label="recite: the living studio"></section>

      <section class="page page--studio" id="studio-tool">
        <p class="eyebrow">The studio</p>
        <h1>Where it lands.</h1>
        <p class="lede">
          Speak a command into the box. The canvas, parser and undo arrive as
          this build goes on.
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

        <p class="note">
          Built in the open, session by session. Every session is recorded.
        </p>
      </section>
    `;
  },

  mount(root: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];

    const world = root.querySelector<HTMLElement>("[data-world]");
    if (world) cleanups.push(mountWorldHero(world));

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
    cleanups.push(scrollReveal(root));
    return () => cleanups.forEach((fn) => fn());
  },
};
