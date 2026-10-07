import "./styles.css";

import studio from "./pages/studio";
import record from "./pages/record";
import about from "./pages/about";
import connect from "./pages/connect";
import { enterPage } from "./lib/motion";

type Route = "studio" | "record" | "about" | "connect";

interface Page {
  title: string;
  render(): string;
  /** Optional hook that runs after the page markup is in the DOM.
   *  Returns a cleanup that is called before the next route renders. */
  mount?(root: HTMLElement): (() => void) | void;
}

const routes: Record<Route, Page> = { studio, record, about, connect };

const DEFAULT_ROUTE: Route = "studio";
const view = document.querySelector<HTMLElement>("#view");
const navLinks = document.querySelectorAll<HTMLAnchorElement>(".site-nav a");

let dispose: (() => void) | null = null;

function currentRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return Object.hasOwn(routes, raw) ? (raw as Route) : DEFAULT_ROUTE;
}

function renderRoute(): void {
  const route = currentRoute();
  const page = routes[route];

  // Revert every tween the previous page created before swapping the DOM.
  dispose?.();
  dispose = null;

  // Canonicalise the hash so the URL always reads #/studio, #/record, #/about.
  if (window.location.hash !== `#/${route}`) {
    history.replaceState(null, "", `#/${route}`);
  }

  if (view) {
    // Only in-repo, static page templates are rendered here; nothing
    // user-supplied is interpolated into this markup.
    view.innerHTML = page.render();
    const pageCleanup = page.mount?.(view);
    const enterCleanup = enterPage(view);
    dispose = () => {
      if (typeof pageCleanup === "function") pageCleanup();
      enterCleanup();
    };
  }

  document.body.dataset.page = route;
  document.title = page.title;

  for (const link of navLinks) {
    if (link.dataset.route === route) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", renderRoute);
renderRoute();
