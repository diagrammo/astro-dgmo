# `tests/fixture/` — working Astro 6 + dgmo reference

A minimal Astro 6 site wired with `astro-dgmo` and `remark-dgmo`. Two
purposes:

1. **Consumer copy-paste template.** If you want to use this plugin
   in your own Astro site, [`astro.config.mjs`](./astro.config.mjs) +
   [`src/layouts/Base.astro`](./src/layouts/Base.astro) are the
   smallest working configuration. They cover the two non-obvious
   gotchas:
   - **Just add `integrations: [dgmo()]`.** No `@astrojs/mdx` needed
     for plain `.md` — Astro's built-in markdown processor handles
     fenced blocks through the integration's remark plugin.
   - **Import the CSS in a global layout.** Astro 6's
     `astro:config:setup` hook has no programmatic stylesheet
     injection (only `injectScript`), so the dark/light toggle CSS
     must be imported manually: `import 'remark-dgmo/client.css';`
     inside a layout's frontmatter. Astro then bundles those rules
     into the page `<style>` tag automatically — no `<link>` element
     is emitted.

2. **Test fixture for plugin development.**
   [`src/pages/index.md`](./src/pages/index.md) exercises four
   shapes, mirroring `docusaurus-plugin-dgmo`'s fixture:
   - Plain block under `colorMode: 'auto'` — dual-render with the
     `data-theme` toggle swapping between the two SVGs
   - Colored sequence diagram with `tag` blocks — exercises palette
     color resolution
   - Showcase mode — diagram + collapsible source + open-in-editor +
     copy toolbar
   - Per-block override — single-render, alternate palette

## Running it

The fixture lives outside the parent repo's pnpm install so it can
use its own lockfile and `link:../..` dep on the plugin source.

```bash
# from the parent astro-dgmo repo root
pnpm build                                # build the plugin
cd tests/fixture
pnpm install --no-frozen-lockfile         # link: deps require non-frozen
pnpm exec astro dev                       # opens http://localhost:4321
# or for a static build:
pnpm exec astro build && pnpm exec astro preview
```

## What to look for

- The page contains four diagram blocks. Three of them ship both a
  light and a dark SVG; CSS hides whichever doesn't match the current
  `<html data-theme="…">` value.
- Top-right "Toggle dark mode" button flips `data-theme` on `<html>`.
  Watch the three `colorMode: 'auto'` blocks swap palette; the
  bottom per-block override stays put (it forces `colorMode=light`).
- View source and confirm only one `<style>` block carries the
  `.dgmo-dark { display: none; }` rules — that's the inlined
  `remark-dgmo/client.css`. No external CSS file is emitted.

## Not shipped to npm

`tests/` is excluded from the npm tarball via `"files": ["dist",
"README.md", "LICENSE"]` in `package.json`. The fixture adds zero
bytes to consumer installs.
