#!/usr/bin/env node
/**
 * build-recite-world.mjs
 *
 * Derives `public/landing-pages/recite-world.html` from the byte-exact
 * canonical ThreeUI "Sylva — Living Green" document kept at
 * `public/landing-pages/inner-green-3d.html`.
 *
 * This follows the ThreeUI catalog's own variant pattern: the packaged file is
 * never edited in place. Every change is an anchored rewrite applied to the
 * source string, and every anchor is asserted, so upstream drift fails the
 * build instead of silently deforming the page.
 *
 * What is rewritten (and why):
 *   - head copy + og tags      → recite's identity
 *   - the embedded Lexend font → local `inner-green-assets/lexend-latin.woff2`
 *                                (same content-addressed bytes, served from us)
 *   - dock                     → mark, labels and hrefs retargeted for recite
 *   - headline + lede          → recite's words, in the authored structure
 *   - the explore pill         → "Open the studio"
 *   - stats                    → honest copy, no invented numbers
 *   - ghost wordmark           → RECITE
 *   - the transformation panel → ADDED (speech in, structure out) and wired
 *                                by the app at runtime
 *   - the vines                → parked: blades, ferns, flowers, shell and
 *                                wire off, butterfly too — words take the
 *                                roots' place (see the word-ribbons)
 *   - the word-ribbons         → ADDED: two SVG textPath marquees (raw speech
 *                                on a faint arc, refined commands on the
 *                                band), drawn and driven by the app
 *   - a small override sheet   → headline fit, panel styles, ribbons,
 *                                reduced motion
 *
 * Run: node tools/build-recite-world.mjs   (wired as `prebuild`)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "public", "landing-pages", "inner-green-3d.html");
const OUT = join(here, "..", "public", "landing-pages", "recite-world.html");

let doc = readFileSync(SRC, "utf8");
const applied = [];

function rewrite(name, find, replace, count = 1) {
  const hits = doc.split(find).length - 1;
  if (hits !== count) {
    throw new Error(`[${name}] anchor found ${hits}× (expected ${count}) — upstream document drifted`);
  }
  doc = doc.split(find).join(replace);
  applied.push(name);
}

/* ── 1. head identity ────────────────────────────────────────────────────── */

rewrite("head/title",
  `<title>Sylva — Into the living world</title>`,
  `<title>sayshell: say it, check it, run it</title>
<meta property="og:type" content="website">
<meta property="og:title" content="sayshell: say it, check it, run it">
<meta property="og:description" content="A voice-to-shell safety layer. Dictate a command, see the effect, confirm before anything destructive runs.">
<meta property="og:url" content="https://sayshell.langersword.in/">
<meta name="twitter:card" content="summary">`);

rewrite("head/description",
  `<meta name="description" content="Restoring wild places through patient design, native planting, and a deeper kind of stewardship.">`,
  `<meta name="description" content="A voice-to-shell safety layer. Dictate a command, see the effect, confirm before anything destructive runs.">`);

rewrite("head/font",
  `https://ublctyddhtbgaersvxxb.supabase.co/storage/v1/object/public/threeui-media/scene-images/embedded/1ec8f6ee2750554b4bc59ff0b507d316a82a7ba37e0e5bebc41d3bd9b9faad46.woff2`,
  `inner-green-assets/lexend-latin.woff2`);

rewrite("head/favicon",
  `%3Cpath fill='%23fff' d='M11 1.3c-2.1 0-3.95 1.2-4.75 2.95C3.95 4.55 2.3 6.25 2.3 8.35c0 2.3 1.9 4.2 4.3 4.2h8.8c2.4 0 4.3-1.9 4.3-4.2 0-2.1-1.65-3.8-4-4.1C14.95 2.5 13.1 1.3 11 1.3Z'/%3E%3Cpath fill='%23fff' d='M9.6 12.55h2.8v4.2c1.35.3 2.45 1.15 3.15 2.4-1.35.4-2.4.15-3.15-.4v4.15H9.6v-4.15c-.75.55-1.8.8-3.15.4.7-1.25 1.8-2.1 3.15-2.4v-4.2Z'/%3E`,
  `%3Ccircle cx='11' cy='12' r='5.5' fill='%23fff'/%3E`);

/* ── 2. dock ─────────────────────────────────────────────────────────────── */

rewrite("dock/mark-anchor",
  `<a class="dock-item dock-mark" data-dock data-spec data-burst href="#" style="--d:120ms" aria-label="Sylva — home">`,
  `<a class="dock-item dock-mark" data-dock data-spec data-burst href="#/about" style="--d:120ms" aria-label="sayshell: home">`);

rewrite("dock/mark-glyph",
  `          <path d="M11 1.3c-2.1 0-3.95 1.2-4.75 2.95C3.95 4.55 2.3 6.25 2.3 8.35c0 2.3 1.9 4.2 4.3 4.2h8.8c2.4 0 4.3-1.9 4.3-4.2 0-2.1-1.65-3.8-4-4.1C14.95 2.5 13.1 1.3 11 1.3Z"/>
          <path d="M9.6 12.55h2.8v4.2c1.35.3 2.45 1.15 3.15 2.4-1.35.4-2.4.15-3.15-.4v4.15H9.6v-4.15c-.75.55-1.8.8-3.15.4.7-1.25 1.8-2.1 3.15-2.4v-4.2Z"/>`,
  `          <circle cx="11" cy="12" r="5.4"/>`);

rewrite("dock/studio-href",
  `<a class="dock-item is-active" data-dock data-spec data-burst href="#" style="--d:180ms">`,
  `<a class="dock-item is-active" data-dock data-spec data-burst href="#/about" style="--d:180ms">`);

rewrite("dock/label-grove", `<span>Grove</span>`, `<span>about</span>`);

/* The canonical "Grove" sprout glyph is a plant; the studio is a graph. */
rewrite("dock/glyph-studio",
  `          <svg viewBox="0 0 16 16"><path d="M8 14V9"/><path d="M8 9c0-2.4 1.7-4.3 4-4.3.2 2.6-1.6 4.6-4 4.3Z"/><path d="M8 10.5C7.9 8.4 6.4 6.8 4.4 6.8 4.3 8.9 5.9 10.6 8 10.5Z"/></svg>`,
  `          <svg viewBox="0 0 16 16"><circle cx="4.2" cy="11.2" r="1.7"/><circle cx="11.8" cy="4.8" r="1.7"/><circle cx="11.8" cy="11.9" r="1.7"/><path d="M5.6 10.3 10.4 5.7"/><path d="M5.9 11.5 10.1 11.8"/></svg>`);

rewrite("dock/record-href",
  `<a class="dock-item" data-dock data-spec data-burst href="#" style="--d:230ms">`,
  `<a class="dock-item" data-dock data-spec data-burst href="#/record" style="--d:230ms">`);

rewrite("dock/label-habitats", `<span>Habitats</span>`, `<span>record</span>`);

rewrite("dock/about-href",
  `<a class="dock-item" data-dock data-spec data-burst href="#" style="--d:280ms">`,
  `<a class="dock-item" data-dock data-spec data-burst href="#/about" style="--d:280ms">`);

rewrite("dock/label-journal", `<span>Journal</span>`, `<span>about</span>`);

rewrite("dock/github-href",
  `<a class="dock-item dock-item--enter" data-dock data-spec data-burst href="#" style="--d:330ms">`,
  `<a class="dock-item dock-item--enter" data-dock data-spec data-burst href="https://github.com/LangerSword/sayshell" target="_blank" rel="noopener" style="--d:330ms">`);

rewrite("dock/label-enter", `<span>Enter</span>`, `<span>github</span>`);

/* ── 3. hero copy ────────────────────────────────────────────────────────── */

rewrite("copy/headline-1", `<i style="--d:260ms">Step into</i>`, `<i style="--d:260ms">Say it.</i>`);
rewrite("copy/headline-2", `<i style="--d:360ms">the living world</i>`, `<i style="--d:360ms">Check it. Run it.</i>`);

rewrite("copy/lede",
  `We restore wild places through patient design, native planting, and a deeper kind of stewardship.`,
  `sayshell is a shell front end. You dictate a command. It checks the command, shows the effect, and asks before anything destructive runs.`);

rewrite("copy/pill-label", `<span class="lbl">Explore the work</span>`, `<span class="lbl">Read on github</span>`);

rewrite("copy/stat-a", `<div><dt>Canopy restored</dt><dd>282 ha</dd></div>`, `<div><dt>The gate</dt><dd>checks the command</dd></div>`);
rewrite("copy/stat-b", `<div><dt>Native species</dt><dd>43 mapped</dd></div>`, `<div><dt>Every run</dt><dd>keeps a receipt</dd></div>`);

rewrite("copy/ghost", `<div class="ghost fade" style="--d:1150ms" aria-hidden="true">SYLVA</div>`, `<div class="ghost fade" style="--d:1150ms" aria-hidden="true">SAYSHELL</div>`);

rewrite("copy/scroll-href", `<a class="scroll mask" style="--d:1040ms; --pd:9" href="#">`, `<a class="scroll mask" style="--d:1040ms; --pd:9" href="#story">`);

/* ── 4. the transformation panel (added) ─────────────────────────────────── */

const PANEL = `    <!-- recite: the transformation panel. Speech in, structure out: \
the raw dictation refines itself into commands, and each command draws. \
Inside the frame (same origin) so it composites with the world; the app \
drives its timeline. -->
    <aside class="rpanel mask" style="--d:1010ms" id="recite-panel"
      aria-label="Speak a command and watch the diagram draw itself">
      <header class="rpanel-head">
        <span class="rpanel-live" aria-hidden="true"></span>
        <span class="rpanel-state" data-state>listening</span>
        <button class="rpanel-replay" type="button" aria-label="Replay the demonstration">replay</button>
      </header>
      <p class="rpanel-raw" data-raw><span class="w flr">hey</span> <span class="w flr">so</span> <span class="w flr">um</span> <span class="w">add</span> <span class="w flr">like</span> <span class="w">a</span> <span class="w">payments</span> <span class="w">api</span> <span class="w">and</span> <span class="w flr">uh</span> <span class="w">connect</span> <span class="w">it</span> <span class="w">to</span> <span class="w">postgres</span></p>
      <p class="rpanel-divider" data-divider><span>refined into</span></p>
      <ul class="rpanel-cmds" data-cmds>
        <li data-cmd="1"><i aria-hidden="true"></i>add payments api</li>
        <li data-cmd="2"><i aria-hidden="true"></i>connect payments api to postgres</li>
      </ul>
      <svg class="rpanel-canvas" viewBox="0 0 440 132" aria-hidden="true">
        <defs>
          <marker id="rc-arrow" viewBox="0 0 6 6" refX="5.2" refY="3"
                  markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" class="rc-arrow-head"/>
          </marker>
        </defs>
        <path class="rc-edge" data-edge pathLength="1"
              d="M170,46 C225,46 185,90 240,90" marker-end="url(#rc-arrow)" style="opacity:0"/>
        <g class="rc-node" data-node="a" style="opacity:0">
          <rect x="16" y="24" width="154" height="44" rx="11"/>
          <text x="34" y="51">payments api</text>
        </g>
        <g class="rc-node" data-node="b" style="opacity:0">
          <rect x="240" y="68" width="140" height="44" rx="11"/>
          <text x="258" y="95">postgres</text>
        </g>
      </svg>
    </aside>

`;

rewrite("panel/insert",
  `    <dl class="stat stat--a mask" style="--d:700ms; --pd:12">`,
  PANEL + `    <dl class="stat stat--a mask" style="--d:700ms; --pd:12">`);

/* ── 4b. the vine swap: the plant growth gives way to words ──────────────── */

rewrite("plants/shell",
  `    group.add(shell);`,
  `    if (opt.shell !== false) group.add(shell);`);

rewrite("plants/near-zero",
  `      blades: BLADES_NEAR, ferns: small ? 26 : 46, flowers: small ? 120 : 260,`,
  `      blades: 0, ferns: 0, flowers: 0, shell: false,`);
rewrite("plants/near-wire",
  `      fernSize: [0.22, 0.50], flowerSize: [0.055, 0.118], mainLimbs: mainCount, wire: true,`,
  `      fernSize: [0.22, 0.50], flowerSize: [0.055, 0.118], mainLimbs: mainCount, wire: false,`);

rewrite("plants/far-zero",
  `      blades: BLADES_FAR, ferns: small ? 8 : 16, flowers: small ? 40 : 90,`,
  `      blades: 0, ferns: 0, flowers: 0, shell: false,`);
rewrite("plants/far-wire",
  `      mask: [0.4, 3.4, 0.0, 0.42], wire: true,`,
  `      mask: [0.4, 3.4, 0.0, 0.42], wire: false,`);

rewrite("plants/butterfly",
  `    if (!small) bf = buildButterfly(nearGroup, nearLimbs, nearGroup.userData.uni);`,
  `    /* recite: the butterfly is parked while the vines are words. */`);

/* ── 4c. the word-ribbons (added) ────────────────────────────────────────── */

const RIBBONS = `    <!-- recite: the word-ribbons. The vines give way to words: raw speech
    drifts along a faint arc on the left while the refined commands stream
    across the band below. The app draws the paths in and runs the marquees. -->
    <div class="wr-wrap" id="word-ribbons" aria-hidden="true">
      <svg viewBox="0 0 1600 880" focusable="false">
        <path class="wr-path wr-path--raw" id="wr-raw-path" pathLength="1"
          d="M -60 470 C 120 470, 260 560, 380 640 C 430 672, 470 680, 520 680"/>
        <path class="wr-path wr-path--band" id="wr-band-path" pathLength="1"
          d="M 590 680 C 700 680, 820 690, 960 680 C 1100 670, 1220 650, 1340 640 C 1460 630, 1580 620, 1680 612"/>
        <g class="wr-pill" id="wr-pill" style="opacity:0" clip-path="url(#wr-pill-clip)">
          <clipPath id="wr-pill-clip"><rect x="456" y="662" width="128" height="34" rx="17"/></clipPath>
          <rect class="wr-pill-body" x="456" y="662" width="128" height="34" rx="17"/>
          <rect class="wr-bar" x="474" y="675.0" width="3" height="8.0" rx="1.5"/>
          <rect class="wr-bar" x="479.8" y="672.0" width="3" height="14.0" rx="1.5"/>
          <rect class="wr-bar" x="485.6" y="671.0" width="3" height="16.0" rx="1.5"/>
          <rect class="wr-bar" x="491.4" y="673.5" width="3" height="11.0" rx="1.5"/>
          <rect class="wr-bar" x="497.2" y="671.0" width="3" height="16.0" rx="1.5"/>
          <rect class="wr-bar" x="503" y="674.5" width="3" height="9.0" rx="1.5"/>
          <rect class="wr-bar" x="508.8" y="671.0" width="3" height="16.0" rx="1.5"/>
          <rect class="wr-bar" x="514.6" y="673.0" width="3" height="12.0" rx="1.5"/>
          <rect class="wr-bar" x="520.4" y="671.0" width="3" height="16.0" rx="1.5"/>
          <rect class="wr-bar" x="526.2" y="674.0" width="3" height="10.0" rx="1.5"/>
          <rect class="wr-bar" x="532" y="671.5" width="3" height="15.0" rx="1.5"/>
          <rect class="wr-bar" x="537.8" y="675.0" width="3" height="8.0" rx="1.5"/>
          <rect class="wr-bar" x="543.6" y="671.0" width="3" height="16.0" rx="1.5"/>
          <rect class="wr-bar" x="549.4" y="673.5" width="3" height="11.0" rx="1.5"/>
          <rect class="wr-bar" x="555.2" y="672.0" width="3" height="14.0" rx="1.5"/>
          <rect class="wr-bar" x="561" y="674.5" width="3" height="9.0" rx="1.5"/>
        </g>
        <text class="wr-text wr-text--raw" dy="-3">
          <textPath class="wr-run" href="#wr-raw-path"><tspan class="wr-seg" data-seg="1">okay so <tspan class="flr">um</tspan> I want to delete the branches that are already merged into main</tspan><tspan class="wr-seg" data-seg="2"> and <tspan class="flr">uh</tspan> I think there are like twenty of them</tspan><tspan class="wr-seg" data-seg="3"> <tspan class="flr">um</tspan> can you clean that up for me</tspan><tspan class="wr-seg" data-seg="4"> and <tspan class="flr">uh</tspan> also show me the disk usage</tspan><tspan class="wr-seg" data-seg="5"> and <tspan class="flr">um</tspan> what is the git status right now</tspan><tspan class="wr-seg" data-seg="6"> and <tspan class="flr">uh</tspan> list the ten biggest files here</tspan></textPath>
        </text>
        <text class="wr-text wr-text--ref" dy="-3">
          <textPath class="wr-run" href="#wr-band-path" data-repeat="git branch --merged main | grep -v main | xargs git branch -d → gate: ask (deletes refs) → df -h → gate: allow (read only) → git status → gate: allow (read only) → du -ah . | sort -rh | head -n 10 → gate: allow (read only) → ">marketplace saas → accounts + seller profiles + ratings → listings + search + categories → checkout + payments + refunds → order queue + email workers → seller dashboard + payouts → postgres with pooling + read replicas → </textPath>
        </text>
      </svg>
    </div>

`;

rewrite("ribbons/insert",
  `    <!-- recite: the transformation panel.`,
  RIBBONS + `    <!-- recite: the transformation panel.`);

/* ── 5. override sheet (appended to the authored <style>) ────────────────── */

const OVERRIDES = `
  /* ══ recite: derived overrides (added by tools/build-recite-world.mjs) ══
     Headline fit for recite's longer first line, and the transformation
     panel. The panel borrows the dock's material: translucent, lit top
     edge, no backdrop-filter over the live canvas (see the dock note). */
  html,body{ height:100% !important; overflow:hidden !important; }
  @media (min-width:901px){
    .headline{ font-size:calc(54 * var(--u)); line-height:calc(58 * var(--u)); }
    .lede{ left:calc(552 * var(--u)); }
  }
  .card,.knob,.knob-float,.play-wrap{ display:none !important; }
  .rpanel{
    position:absolute; z-index:6;
    left:calc(776 * var(--u)); top:calc(184 * var(--u));
    width:calc(456 * var(--u));
    padding:calc(20 * var(--u)) calc(24 * var(--u)) calc(16 * var(--u));
    border-radius:calc(14 * var(--u));
    border:1px solid rgba(255,255,255,.11);
    background:
      linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,0) 42%),
      rgba(30,35,27,.84);
    box-shadow:0 calc(8 * var(--u)) calc(22 * var(--u)) rgba(10,14,8,.30),
               inset 0 1px rgba(255,255,255,.06);
    color:var(--ink);
  }
  .rpanel-head{ display:flex; align-items:center; gap:calc(8 * var(--u)); margin-bottom:calc(13 * var(--u)); }
  .rpanel-live{
    width:calc(8 * var(--u)); height:calc(8 * var(--u)); border-radius:50%; flex:none;
    background:rgba(255,255,255,.85);
    animation:rpPulse 2.2s var(--ease) infinite;
  }
  @keyframes rpPulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.32;transform:scale(.8)} }
  .rpanel-state{
    font-size:calc(11 * var(--u)); font-weight:500;
    letter-spacing:calc(1.5 * var(--u)); text-transform:uppercase; color:var(--ink-soft);
  }
  .rpanel-replay{
    margin-left:auto; appearance:none; background:none; border:0; padding:calc(2 * var(--u)) 0;
    font:inherit; font-size:calc(10 * var(--u)); font-weight:500;
    letter-spacing:calc(1.5 * var(--u)); text-transform:uppercase;
    color:rgba(255,255,255,.5); cursor:pointer;
    transition:color .18s var(--ease);
  }
  .rpanel-replay:hover{ color:var(--ink); }
  .rpanel-replay{ color:rgba(255,255,255,.62); }
  .rpanel-raw{
    margin:0 0 calc(12 * var(--u));
    font-size:calc(14.5 * var(--u)); line-height:calc(21 * var(--u));
    font-weight:300; color:var(--ink-soft);
  }
  .rpanel-raw .w{ display:inline; }
  .rpanel-raw .flr{ position:relative; color:var(--ink-faint); }
  .rpanel-raw .flr::after{
    content:''; position:absolute; left:0; right:0; top:54%; height:1px;
    background:currentColor; transform:scaleX(0); transform-origin:0 50%;
  }
  .rpanel-raw .flr.is-struck::after{ transform:scaleX(1); transition:transform .42s var(--ease); }
  .rpanel-raw .flr.is-struck{ color:rgba(255,255,255,.24); transition:color .5s var(--ease); }
  .rpanel-raw.is-polishing{
    background-image:linear-gradient(100deg, rgba(255,255,255,.28) 0%, #fff 20%, rgba(255,255,255,.28) 40%);
    background-size:220% 100%; background-repeat:no-repeat;
    -webkit-background-clip:text; background-clip:text; color:transparent;
    animation:rpSweep 1.4s ease-in-out 1;
  }
  @keyframes rpSweep{ from{background-position:130% 0} to{background-position:-30% 0} }
  .rpanel-divider{ display:flex; align-items:center; gap:calc(10 * var(--u)); margin:0 0 calc(10 * var(--u)); opacity:0; }
  .rpanel-divider span{
    font-size:calc(9.5 * var(--u)); font-weight:500;
    letter-spacing:calc(1.8 * var(--u)); text-transform:uppercase;
    color:rgba(255,255,255,.42); white-space:nowrap;
  }
  .rpanel-divider::before,.rpanel-divider::after{ content:''; height:1px; background:rgba(255,255,255,.12); flex:1; }
  .rpanel-cmds{ list-style:none; margin:0 0 calc(12 * var(--u)); padding:0; display:grid; gap:calc(7 * var(--u)); }
  .rpanel-cmds li{
    display:flex; align-items:baseline; gap:calc(9 * var(--u));
    font-size:calc(13 * var(--u)); font-weight:400; color:var(--ink);
  }
  .rpanel-cmds li i{
    width:calc(5 * var(--u)); height:calc(5 * var(--u)); border-radius:1px; flex:none;
    background:rgba(255,255,255,.55); transform:translateY(calc(-1 * var(--u)));
  }
  .rpanel-canvas{ display:block; width:100%; height:auto; }
  .rc-node rect{ fill:rgba(28,33,26,.85); stroke:rgba(255,255,255,.24); stroke-width:1; }
  .rc-node text{ font-family:'Lexend',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:12px; font-weight:400; letter-spacing:.4px; fill:rgba(255,255,255,.85); }
  .rc-edge{ fill:none; stroke:rgba(255,255,255,.45); stroke-width:1.4; stroke-dasharray:1; stroke-dashoffset:1; }
  .rc-arrow-head{ fill:rgba(255,255,255,.45); }
  @media (max-width:900px){
    .rpanel{ left:calc(34 * var(--u)); top:calc(648 * var(--u)); width:calc(692 * var(--u));
             padding:calc(30 * var(--u)) calc(34 * var(--u)) calc(24 * var(--u)); }
    .rpanel-raw{ font-size:calc(26 * var(--u)); line-height:calc(37 * var(--u)); }
    .rpanel-state, .rpanel-replay{ font-size:calc(22 * var(--u)); letter-spacing:calc(2.6 * var(--u)); }
    .rpanel-divider span{ font-size:calc(18 * var(--u)); letter-spacing:calc(3.2 * var(--u)); }
    .rpanel-cmds li{ font-size:calc(26 * var(--u)); }
    .rc-node text{ font-size:15px; }
  }
  @media (prefers-reduced-motion:reduce){
    .rpanel-live{ animation:none; }
    .rpanel-raw.is-polishing{ animation:none; color:inherit; background-image:none; -webkit-background-clip:border-box; background-clip:border-box; }
    .rpanel-raw .flr.is-struck::after{ transition:none; }
  }

  /* ══ recite: the word-ribbons (vines give way to words) ══
     Raw speech drifts along a faint arc; the refined commands ride the
     band. The app draws the paths in (dash) and runs the marquees (x). */
  .wr-wrap{
    position:absolute; left:0; top:0; z-index:3;
    width:calc(1600 * var(--u)); height:calc(880 * var(--u));
    pointer-events:none;
    -webkit-mask-image:linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%);
            mask-image:linear-gradient(90deg, transparent 0, #000 5%, #000 95%, transparent 100%);
  }
  .wr-wrap svg{ display:block; width:100%; height:100%; overflow:visible; }
  .wr-path{ fill:none; stroke-dasharray:1; stroke-dashoffset:1; }
  .wr-path--raw{ stroke:rgba(255,255,255,.09); stroke-width:1; }
  .wr-path--band{ stroke:#1f2a1c; stroke-width:26; stroke-linecap:round; }
  .wr-text{ opacity:0; }
  .wr-text--raw{
    font-family:'Lexend',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size:17px; font-weight:300; letter-spacing:.4px;
    fill:rgba(255,255,255,.55);
  }
  .wr-text--raw .flr{ fill:rgba(255,255,255,.30); transition:fill .45s var(--ease); }
  .wr-text--raw .flr.is-struck{
    fill:rgba(255,255,255,.20);
    text-decoration:line-through;
  }
  .wr-text--ref{
    font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;
    font-size:13.5px; font-weight:400; letter-spacing:.2px;
    fill:#b9d3a4;
  }
  .wr-pill-body{ fill:rgba(233,231,220,.95); }
  .wr-bar{ fill:#242820; transform-box:fill-box; transform-origin:50% 50%; }
  @media (max-width:900px){ .wr-wrap{ display:none; } }
  @media (prefers-reduced-transparency:reduce){
    .rpanel{ background:rgba(30,35,27,.97); box-shadow:none; }
    .wr-wrap{ -webkit-mask-image:none; mask-image:none; }
  }
  @media (prefers-reduced-motion:reduce){
    .wr-path{ stroke-dashoffset:0 !important; }
    .wr-text{ opacity:1 !important; }
    .wr-pill{ opacity:1 !important; }
    .wr-text--raw .flr{ text-decoration:line-through; fill:rgba(255,255,255,.22); }
  }
`;

rewrite("overrides/append", `</style>`, OVERRIDES + `</style>`);

/* ── write ───────────────────────────────────────────────────────────────── */

writeFileSync(OUT, doc);
const sha = createHash("sha256").update(doc, "utf8").digest("hex");
console.log("recite-world.html built");
console.log("  rewrites:", applied.length);
console.log("  bytes:", Buffer.byteLength(doc, "utf8"), "| sha256:", sha);
