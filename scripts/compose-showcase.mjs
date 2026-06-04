#!/usr/bin/env node
// Compose the GitHub Pages showcase page.
//
// Fetches dgmo-content's all-chart-types.md and splices its body beneath the
// target fixture page's existing frontmatter — reusing the page's layout and
// `remark-dgmo/client.css` wiring untouched. CI-only: the rewritten page is
// built and deployed but never committed.
//
// Usage: node scripts/compose-showcase.mjs <fixture-page-path>
import { readFileSync, writeFileSync } from 'node:fs';

const RAW =
  'https://raw.githubusercontent.com/diagrammo/dgmo-content/main/examples/all-chart-types.md';

const pagePath = process.argv[2];
if (!pagePath) {
  console.error('usage: compose-showcase.mjs <fixture-page-path>');
  process.exit(1);
}

const res = await fetch(RAW);
if (!res.ok) {
  console.error(`fetch ${RAW} failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const showcase = await res.text();

const page = readFileSync(pagePath, 'utf8');
const fm = page.match(/^---\n[\s\S]*?\n---\n/);
if (!fm) {
  console.error(`no frontmatter block found in ${pagePath}`);
  process.exit(1);
}

// Drop the source H1 — the page frontmatter title already serves as heading.
const body = showcase.replace(/^#[^\n]*\n/, '');

writeFileSync(pagePath, `${fm[0]}\n${body}`);
console.log(`composed ${body.length} bytes of showcase into ${pagePath}`);
