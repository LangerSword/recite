import "./styles.css";

import studio from "./pages/studio";
import record from "./pages/record";
import about from "./pages/about";

type Route = "studio" | "record" | "about";

interface Page {
  title: string;
  render(): string;
  /** Optional hook that runs after the page markup is in the DOM. */
  mount?(root: HTMLElement): void;
}

const routes: Record<Route, Page> = { studio, record, about };

const DEFAULT_ROUTE: Route = "studio";
const view = document.querySelector<HTMLElement>("#view");
const navLinks = document.querySelectorAll<HTMLAnchorElement>(".site-nav a");

function currentRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return Object.hasOwn(routes, raw) ? (raw as Route) : DEFAULT_ROUTE;
}

function renderRoute(): void {
  const route = currentRoute();
  const page = routes[route];

  // Canonicalise the hash so the URL always reads #/studio, #/record, #/about.
  if (window.location.hash !== `#/${route}`) {
    history.replaceState(null, "", `#/${route}`);
  }

  if (view) {
    view.innerHTML = page.render();
    page.mount?.(view);
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
