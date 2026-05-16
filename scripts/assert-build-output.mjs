#!/usr/bin/env node
// Validate the astro-dgmo fixture build output.
//
// Invoked from the `test:e2e` script after `astro build` runs against
// `tests/fixture/`. CWD when this script runs is `tests/fixture/`.
//
// Checks:
//   1. The built page HTML contains both `dgmo-light` and `dgmo-dark` class
//      names (dual-render emitted).
//   2. The page <head> contains an inline <style> block whose contents
//      include the `.dgmo-dark { display: none; }` rule from
//      remark-dgmo/client.css. Astro inlines CSS imports into the page —
//      it does NOT emit a <link>, which is what the docusaurus equivalent
//      script checks.
//   3. The page-specific JS chunk(s) do NOT contain the jsdom-internal
//      sentinel string. Browser bundles must drop jsdom at the runtime-
//      construction boundary in dgmo/src/render.ts.
//   4. The summed gzipped size of the page-specific JS chunks stays
//      within 100 KB of the committed baseline (or seeds the baseline on
//      first run).
//
// Exit codes: 0 on pass, 1 on any failure.

import { readFileSync, statSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const FIXTURE = process.cwd();
const HTML_PATH = resolve(FIXTURE, 'dist/index.html');
const ASSETS = resolve(FIXTURE, 'dist/_astro');
const BASELINE = resolve(FIXTURE, 'baseline-bundle-size.json');
const JSDOM_SENTINEL = 'http://www.w3.org/2000/xmlns/';
const BUDGET_BYTES = 100 * 1024;

function fail(msg) {
  console.error(`::error::${msg}`);
  process.exit(1);
}

if (!existsSync(HTML_PATH)) fail(`Built HTML missing: ${HTML_PATH}`);

const html = readFileSync(HTML_PATH, 'utf8');

if (!/\bdgmo-light\b/.test(html)) fail('built HTML missing dgmo-light wrapper');
if (!/\bdgmo-dark\b/.test(html)) fail('built HTML missing dgmo-dark wrapper');

// Astro inlines `import 'remark-dgmo/client.css'` into a <style> block in
// <head>. Look for the three load-bearing rules from remark-dgmo's stylesheet.
const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
if (!headMatch) fail('built HTML has no <head> section');
const head = headMatch[1];

const styleBlocks = [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
  m => m[1]
);
if (styleBlocks.length === 0) {
  fail('built HTML has no inline <style> blocks in <head>');
}
const allStyleText = styleBlocks.join('\n');
if (!/\.dgmo-dark\s*,?\s*\[data-theme=["']?dark["']?\]\s*\.dgmo-light\s*\{[^}]*display\s*:\s*none/.test(
  allStyleText
)) {
  fail(
    'inlined <style> blocks do not contain the remark-dgmo/client.css color-mode rules. ' +
      'Did the user forget `import "remark-dgmo/client.css"` in a global layout?'
  );
}

console.log(
  '✓ HTML contains dgmo-light, dgmo-dark, and inlined remark-dgmo/client.css rules'
);

// Astro's per-page JS chunks live in dist/_astro/. Cross-reference what the
// HTML links to so we score only the chunks actually shipped to this page.
if (!existsSync(ASSETS)) {
  console.warn(
    `::warning::no dist/_astro dir found — astro emitted zero page chunks. Sentinel/byte checks skipped.`
  );
} else {
  const allChunks = readdirSync(ASSETS).filter(f => f.endsWith('.js'));
  const referenced = allChunks.filter(f =>
    html.includes(`/_astro/${f}`)
  );

  if (referenced.length === 0) {
    console.warn(
      `::warning::no per-page JS chunks referenced from the index page; sentinel/byte checks skipped`
    );
  } else {
    for (const chunk of referenced) {
      const body = readFileSync(join(ASSETS, chunk), 'utf8');
      if (body.includes(JSDOM_SENTINEL)) {
        fail(
          `jsdom sentinel "${JSDOM_SENTINEL}" found in ${chunk} — jsdom leaked into client bundle`
        );
      }
    }
    console.log(`✓ ${referenced.length} per-page JS chunks free of jsdom sentinel`);

    const totalGzipped = referenced.reduce(
      (acc, chunk) => acc + gzipSync(readFileSync(join(ASSETS, chunk))).length,
      0
    );
    if (!existsSync(BASELINE)) {
      writeFileSync(
        BASELINE,
        JSON.stringify(
          { totalGzippedBytes: totalGzipped, capturedAt: new Date().toISOString() },
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
