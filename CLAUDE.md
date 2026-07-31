# astro-dgmo

Astro integration wrapping `remark-dgmo`. `src/index.ts` is the whole product: an `AstroIntegration` whose single `astro:config:setup` hook pushes `remarkDgmo` into `markdown.remarkPlugins` and inlines the client script. `options.ts` and `remark.ts` are v0.2 back-compat re-exports of `remark-dgmo` — this package owns no option surface of its own.

Shared wrapper contract: [`../remark-dgmo/WRAPPER-CONVENTIONS.md`](../remark-dgmo/WRAPPER-CONVENTIONS.md). Release order lives in the workspace CLAUDE.md — `remark-dgmo` publishes and lands on npm before this does.

## Versions — read `package.json`, these drift

- `remark-dgmo` `^0.11.0` — the only wrapper on 0.11; the other three sit on `^0.10.0`
- peers: `@diagrammo/dgmo` `>=0.57.0 <1` (the highest floor of the four), `astro` `^4 || ^5 || ^6`
- Caret on a `0.x` dep pins the **minor**, so every `remark-dgmo` minor needs an explicit bump here

## Host specifics

- **Astro cannot inject a stylesheet.** `astro:config:setup` exposes `injectScript` and nothing for CSS, so users must `import 'remark-dgmo/client.css'` in a global layout themselves. Astro's Vite pipeline inlines it into `<style>`, or emits `/_astro/*.css` once past the inline threshold — the assert script accepts both forms.
- **Client JS is inlined bytes, not an import.** `readFileSync(import.meta.resolve('remark-dgmo/client.js'))` at config-setup time. There is no Astro route hook, so the script self-attaches a `MutationObserver` on `<html>`.
- 🔴 **`references.refresh === 'render'` stays opt-in.** Injecting `client-render.js` unconditionally took the fixture from 1 chunk / 7,990 gzipped bytes to 90 chunks / 634,199. The flag is the whole reason that second module is separate.
- Legacy `astro-dgmo-*` class names are still emitted alongside `dgmo-*` via `legacyClassNames`. The code comment says "Removed in v0.4"; the package is on 0.8 and they are still there — the comment is stale, the behavior is current.

## Verify

`pnpm test` then `pnpm test:e2e` — the latter builds `tests/fixture/` with `astro build` and runs `scripts/assert-build-output.mjs`: dual-render class names, the `client.css` rule reaching `<head>`, no jsdom sentinel in browser chunks, and gzipped page JS within 100 KB of `tests/fixture/baseline-bundle-size.json`. CI also gates on `pnpm check:all` (knip + jscpd + depcheck).

`pages.yml` rebuilds the same fixture with dgmo-content's all-chart-types page composed in, and publishes it to GitHub Pages.
