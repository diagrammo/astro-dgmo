#!/usr/bin/env node
// Validate the astro-dgmo fixture build output.
//
// Invoked from the `test:e2e` script after `astro build` runs against
// `tests/fixture/`. CWD when this script runs is `tests/fixture/`.
//
// Checks:
//   1. The built page HTML contains both `dgmo-light` and `dgmo-dark` class
//      names (dual-render emitted).
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

// Astro either inlines `import 'remark-dgmo/client.css'` into a <style>
// block in <head> or, above its inline threshold, emits a
// <link rel="stylesheet" href="/_astro/*.css">. Gather CSS from both and
// look for the load-bearing color-mode rule from remark-dgmo's stylesheet.
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
if (
  !/\.dgmo-dark\s*,?\s*\[data-theme=["']?dark["']?\]\s*\.dgmo-light\s*\{[^}]*display\s*:\s*none/.test(
    allStyleText
  )
) {
  fail(
    'page CSS (inline <style> + linked stylesheets) does not contain the remark-dgmo/client.css color-mode rules. ' +
      'Did the user forget `import "remark-dgmo/client.css"` in a global layout?'
  );
}

console.log(
  '✓ HTML contains dgmo-light, dgmo-dark, and the remark-dgmo/client.css rules'
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
