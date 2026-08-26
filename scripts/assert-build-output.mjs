#!/usr/bin/env node
// Validate the astro-dgmo fixture build output.
//
// Invoked from the `test:e2e` script after `astro build` runs against
// `tests/fixture/`. CWD when this script runs is `tests/fixture/`.
//
// Checks:
//   1. The built page HTML contains both `dgmo-light` and `dgmo-dark` class
//      names (dual-render emitted), no fence baked the error card, and the
//      map fence drew a real basemap.
//   2. The page <head> ships CSS (inline <style> and/or linked /_astro/*.css
//      — Astro links instead of inlining once the stylesheet exceeds its
//      inline threshold, which remark-dgmo 0.5's larger client.css does)
//      whose contents include the `.dgmo-dark { display: none; }` rule from
//      remark-dgmo/client.css.
//   3. The page-specific JS chunk(s) do NOT contain the jsdom-internal
//      sentinel string. Browser bundles must drop jsdom at the runtime-
//      construction boundary in dgmo/src/render.ts.
//   4. The summed gzipped size of the page-specific JS chunks stays
//      within 100 KB of the committed baseline (or seeds the baseline on
//      first run).
//
// Exit codes: 0 on pass, 1 on any failure.

import {
  readFileSync,
  statSync,
  readdirSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const FIXTURE = process.cwd();
const HTML_PATH = resolve(FIXTURE, 'dist/index.html');
const ASSETS = resolve(FIXTURE, 'dist/_astro');
const BASELINE = resolve(FIXTURE, 'baseline-bundle-size.json');
const JSDOM_SENTINEL = 'http://www.w3.org/2000/xmlns/';
const BUDGET_BYTES = 100 * 1024;

/** Chunk filenames carry `.` and `-`; both are regex metacharacters in a class. */
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}

if (!existsSync(HTML_PATH)) fail(`Built HTML missing: ${HTML_PATH}`);

const html = readFileSync(HTML_PATH, 'utf8');

if (!/\bdgmo-light\b/.test(html)) fail('built HTML missing dgmo-light wrapper');
if (!/\bdgmo-dark\b/.test(html)) fail('built HTML missing dgmo-dark wrapper');
// The dark wrapper ships `hidden` (@diagrammo/dgmo >= 0.76.0) so that a page
// which never loaded the stylesheet shows ONE diagram rather than both. It is
// user-agent origin, so the color-mode rules asserted below still override it.
if (!/<div class="dgmo-dark[^"]*"[^>]*\shidden>/.test(html))
  fail(
    'the dgmo-dark wrapper is not `hidden` — a page without our stylesheet would render every diagram twice (issue 507)'
  );
if (/<div class="dgmo-light[^"]*"[^>]*\shidden>/.test(html))
  fail('the dgmo-light wrapper is `hidden` — it is the no-stylesheet default and must never be');

// The map fence drew a map, not the error card. dgmo reads no basemap files
// on its own — remark-dgmo hands them over — and when nobody does, a map
// still "builds" and still emits a figure, so only the CONTENT of the SVG
// tells the two apart. Between dgmo 0.62.0 and 0.66.0 every map fence on
// every wrapper baked the error card, and no fixture here contained a map to
// notice; that is why this asserts on the page rather than on a unit.
if (/Couldn't render this diagram/.test(html))
  fail('built HTML contains the dgmo error card — a fence failed to render');
if (/no basemap data/.test(html))
  fail(
    'the map fence rendered the "no basemap data" card — remark-dgmo is not ' +
      'supplying mapData, or the installed @diagrammo/dgmo predates 0.66.0'
  );
// Place labels resolve off the gazetteer, so their presence proves real
// basemap data was loaded rather than an empty frame being drawn. `Miami` is
// the load-bearing half, and the pair is deliberate: the error card echoes the
// opening lines of the source it could not render, so `Denver` (line 3) shows
// up even in a broken build. `Miami` is line 4, past that echo. Do not
// "simplify" this to a single label.
for (const place of ['Denver', 'Miami']) {
  if (!html.includes(place))
    fail(`map fence rendered without its "${place}" label`);
}

// Astro either inlines the injected `import 'remark-dgmo/client.css'` into a
// <style> block in <head> or, above its inline threshold, emits a
// <link rel="stylesheet" href="/_astro/*.css">. Gather CSS from both and
// look for the load-bearing color-mode rules.
//
// Since astro-dgmo 0.11.0 the integration injects that stylesheet itself
// (`injectScript('page-ssr', ...)`), so this assertion is now checking the
// integration rather than the fixture layout — the layout deliberately does
// NOT import it. A regression here means every consumer's site renders each
// diagram twice (issue 507).
const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
if (!headMatch) fail('built HTML has no <head> section');
const head = headMatch[1];

const styleBlocks = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
  (m) => m[1]
);
const linkedCss = [
  ...head.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g),
]
  .map((m) => m[1])
  .filter((href) => href.startsWith('/'))
  .map((href) => {
    const p = resolve(FIXTURE, 'dist', `.${href}`);
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  });
if (styleBlocks.length === 0 && linkedCss.length === 0) {
  fail(
    'built HTML has no inline <style> blocks or linked stylesheets in <head>'
  );
}
const allStyleText = [...styleBlocks, ...linkedCss].join('\n');
// Checked as two independent facts rather than one selector-list regex: the
// stylesheet gained an `html.dark` pair alongside the `[data-theme]` one, and
// a minifier is free to merge those selectors into any order it likes. A
// regex pinned to one exact merged form would go red on a cosmetic change and
// say "the CSS is missing", which is the wrong diagnosis entirely.
//
// 1. `.dgmo-dark` is hidden by default — the no-toggle floor.
if (!/\.dgmo-dark[^{]*\{[^}]*display\s*:\s*none/.test(allStyleText)) {
  fail(
    'page CSS (inline <style> + linked stylesheets) never hides .dgmo-dark, so every diagram renders TWICE. ' +
      'Did `injectScript("page-ssr", ...)` stop delivering remark-dgmo/client.css?'
  );
}
// 2. Some dark-mode signal un-hides it again — otherwise the toggle is dead.
if (!/\.dgmo-dark[^{]*\{[^}]*display\s*:\s*block/.test(allStyleText)) {
  fail(
    'page CSS hides .dgmo-dark but nothing ever shows it — the dark diagram is unreachable. ' +
      'Expected a [data-theme="dark"] or html.dark rule from remark-dgmo/client.css.'
  );
}

console.log(
  '✓ HTML contains dgmo-light + dgmo-dark, and the injected client.css both hides and reveals the dark wrapper'
);

// Astro's per-page JS chunks live in dist/_astro/.
//
// 🔴 Scoring "chunks the HTML names" is not the same as "JS the browser runs",
// and the difference is not academic. Under `liveLink: { refresh: 'render' }`
// rollup splits the entry into a re-export shim plus a graph reached by static
// import, so the HTML names ONE 77-byte file while the eager payload is ~9.9 KB
// and 88 further chunks hang off a dynamic import. Scored the old way this build
// reported a 9-KB *reduction* and passed. So:
//
//   - the sentinel check reads the EAGER closure, which is a superset of what it
//     read before. It would be better to read every emitted chunk — jsdom in a
//     lazily imported one is still jsdom in a browser — but it cannot yet, and
//     the reason is worth knowing before someone "fixes" it: the sentinel string
//     is the xmlns namespace URI, which is NOT jsdom-specific. It appears in
//     d3-selection's namespace map, and d3 is part of the client renderer that
//     `refresh: 'render'` legitimately ships. Scanning everything therefore fails
//     that build on a false positive. Checked 2026-08-03 against all 90 chunks of
//     a render build: zero occurrences of parse5, nwsapi, cssstyle, SymbolTree,
//     whatwg-url or the literal "jsdom" — the renderer graph is clean, the
//     sentinel is just the wrong probe for it. A jsdom-specific marker that
//     survives minification would let this widen; the same string is hard-coded
//     in the docusaurus, fumadocs and nextra assert scripts too.
//   - the size baseline scores the EAGER closure — the entry scripts plus
//     everything reachable by static import, which is what a reader downloads
//     before anything runs. Dynamic imports are deliberately excluded; charging
//     a page for bytes it fetches only on a code path most readers never take is
//     how a budget stops meaning anything.
if (!existsSync(ASSETS)) {
  console.warn(
    `::warning::no dist/_astro dir found — astro emitted zero page chunks. Sentinel/byte checks skipped.`
  );
} else {
  const allChunks = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
  const entries = allChunks.filter((f) =>
    new RegExp(`<script[^>]+src="[^"]*/_astro/${escapeRe(f)}"`).test(html)
  );

  // Static `import ... from './x.js'` — fetched before the module executes.
  // NOT `import('./x.js')`, which the leading-character guard excludes.
  const STATIC_IMPORT =
    /(?:^|[;}\s])import\s*(?:[^'"()]*?from\s*)?["']\.\/([A-Za-z0-9._-]+\.js)["']/g;
  const eager = new Set();
  const queue = [...entries];
  while (queue.length) {
    const chunk = queue.shift();
    if (eager.has(chunk) || !allChunks.includes(chunk)) continue;
    eager.add(chunk);
    const body = readFileSync(join(ASSETS, chunk), 'utf8');
    for (const m of body.matchAll(STATIC_IMPORT)) queue.push(m[1]);
  }

  if (eager.size === 0) {
    console.warn(
      `::warning::no per-page JS chunks referenced from the index page; sentinel/byte checks skipped`
    );
  } else {
    for (const chunk of eager) {
      const body = readFileSync(join(ASSETS, chunk), 'utf8');
      if (body.includes(JSDOM_SENTINEL)) {
        fail(
          `jsdom sentinel "${JSDOM_SENTINEL}" found in ${chunk} — jsdom leaked into client bundle`
        );
      }
    }
    console.log(
      `✓ ${eager.size} eager JS chunks free of jsdom sentinel (${allChunks.length} emitted)`
    );

    const totalGzipped = [...eager].reduce(
      (acc, chunk) => acc + gzipSync(readFileSync(join(ASSETS, chunk))).length,
      0
    );
    if (!existsSync(BASELINE)) {
      writeFileSync(
        BASELINE,
        JSON.stringify(
          {
            totalGzippedBytes: totalGzipped,
            capturedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );
      console.log(
        `✓ Baseline seeded at ${totalGzipped} bytes (gzipped). Commit ${BASELINE} to enable regression checks.`
      );
    } else {
      const prev = JSON.parse(readFileSync(BASELINE, 'utf8')).totalGzippedBytes;
      const delta = totalGzipped - prev;
      if (Math.abs(delta) > BUDGET_BYTES) {
        fail(
          `bundle-size delta ${delta} bytes exceeds ${BUDGET_BYTES} budget (baseline ${prev}, current ${totalGzipped})`
        );
      }
      console.log(
        `✓ Bundle size ${totalGzipped} (Δ${delta} bytes) within ±${BUDGET_BYTES}`
      );
    }
  }
}

console.log('✓ fixture build output assertions pass');
