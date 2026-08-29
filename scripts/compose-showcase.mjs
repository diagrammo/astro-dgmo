#!/usr/bin/env node
// Compose the GitHub Pages showcase page.
//
// Fetches dgmo-content's live-links.md and all-chart-types.md and splices them
// beneath the target fixture page's existing frontmatter — reusing the page's
// layout and `remark-dgmo/client.css` wiring untouched. CI-only: the rewritten
// page is built and deployed but never committed.
//
// Usage: node scripts/compose-showcase.mjs <fixture-page-path>
import { readFileSync, writeFileSync } from 'node:fs';

const BASE =
  'https://raw.githubusercontent.com/diagrammo/dgmo-content/main/examples';
const RAW = `${BASE}/all-chart-types.md`;
// Top billing: a live link is the one thing this integration does that a
// screenshot in a docs folder cannot, so it leads the page.
const INTRO_RAW = `${BASE}/docs/live-links.md`;

const pagePath = process.argv[2];
if (!pagePath) {
  console.error('usage: compose-showcase.mjs <fixture-page-path>');
  process.exit(1);
}

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  return res.text();
};

// LIVE_LINK_SRC=<path> composes the intro from a local file instead of the
// network — how this page is checked before the dgmo-content change is pushed.
const [intro, showcase] = await Promise.all([
  process.env.LIVE_LINK_SRC
    ? readFileSync(process.env.LIVE_LINK_SRC, 'utf8')
    : get(INTRO_RAW),
  get(RAW),
]);

const page = readFileSync(pagePath, 'utf8');
const fm = page.match(/^---\n[\s\S]*?\n---\n/);
if (!fm) {
  console.error(`no frontmatter block found in ${pagePath}`);
  process.exit(1);
}

// Drop the source H1 — the page frontmatter title already serves as heading.
// Force every ```dgmo fence into showcase mode so the deployed gallery actually
// demonstrates the hover-reveal footer (source + copy + open-in-editor). The
// upstream fences are bare `dgmo` (diagram mode), which ships no footer at all.
const body = showcase
  .replace(/^#[^\n]*\n/, '')
  .replace(/^```dgmo$/gm, '```dgmo showcase');

// The live-link section keeps its fences in diagram mode on purpose. It is the
// one diagram on the page whose source is deliberately not on the page, so a
// showcase footer offering "view source" would undercut what it demonstrates.
writeFileSync(pagePath, `${fm[0]}\n${intro.trim()}\n\n${body}`);
console.log(
  `composed ${intro.length} bytes of live-link intro + ${body.length} bytes of showcase into ${pagePath}`
);
