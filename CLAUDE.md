# astro-dgmo

Astro integration wrapping `remark-dgmo`. `src/index.ts` is the whole product: an `AstroIntegration` whose single `astro:config:setup` hook pushes `remarkDgmo` into `markdown.remarkPlugins` and inlines the client script. `options.ts` and `remark.ts` are v0.2 back-compat re-exports of `remark-dgmo` — this package owns no option surface of its own.

Shared wrapper contract: [`../remark-dgmo/WRAPPER-CONVENTIONS.md`](../remark-dgmo/WRAPPER-CONVENTIONS.md). Release order lives in the workspace CLAUDE.md — `remark-dgmo` publishes and lands on npm before this does.

## Versions — read `package.json`, these drift

- `remark-dgmo` `^0.14.0` — the same version all five wrappers are on (checked 2026-08-04)
- peers: `@diagrammo/dgmo` `>=0.60.0 <1`, `astro` `^4 || ^5 || ^6`. The floor tracks remark-dgmo's own: 0.14.0 imports `@diagrammo/dgmo/live-link-resolve`, a subpath that first exists in dgmo 0.60.0
- `tests/fixture/` pins both **exactly** (`0.14.0` / `0.60.0`) rather than by range: a caret would let CI silently build the Pages showcase against a `remark-dgmo` that predates live links, and the fence would render a reference card instead of the diagram
- Caret on a `0.x` dep pins the **minor**, so every `remark-dgmo` minor needs an explicit bump here

## Host specifics

- **Astro cannot inject a stylesheet.** `astro:config:setup` exposes `injectScript` and nothing for CSS, so users must `import 'remark-dgmo/client.css'` in a global layout themselves. Astro's Vite pipeline inlines it into `<style>`, or emits `/_astro/*.css` once past the inline threshold — the assert script accepts both forms.
- **Client JS is inlined bytes, not an import.** `readFileSync(import.meta.resolve('remark-dgmo/client.js'))` at config-setup time. There is no Astro route hook, so the script self-attaches a `MutationObserver` on `<html>`.
- 🔴 **`liveLink.refresh === 'render'` stays opt-in** — but the number usually quoted for it measures the wrong thing. "1 chunk / 7,990 gzipped bytes → 90 chunks / 634,199" counts bytes *emitted*, not bytes a reader downloads. Re-measured 2026-08-03 by walking the import graph of this fixture with the showcase composed in: **eager page JS 9,135 → 9,875 gzipped (+740 B)**, and 641 KB across 88 chunks reached only through a dynamic `import()`, with no `modulepreload` emitted for any of them. So the page-load cost is small; the 641 KB arrives only when a diagram has actually changed and is being redrawn. Still opt-in — it is a behaviour change and the 641 KB is real when it fires — but decide it on the +740, not on the 634 KB.
- **The Pages showcase is the one build with it on**, via `LIVE_LINK_REFRESH=render` in `pages.yml`. Its own variable, deliberately not `PAGES_BASE`: the e2e build must keep exercising the default every adopter gets, which is what keeps `baseline-bundle-size.json` meaningful.
- Legacy `astro-dgmo-*` class names are still emitted alongside `dgmo-*` via `legacyClassNames`. The code comment says "Removed in v0.4"; the package is on 0.8 and they are still there — the comment is stale, the behavior is current.

## Verify

`pnpm test` then `pnpm test:e2e` — the latter builds `tests/fixture/` with `astro build` and runs `scripts/assert-build-output.mjs`: dual-render class names, the `client.css` rule reaching `<head>`, no jsdom sentinel in browser chunks, and gzipped page JS within 100 KB of `tests/fixture/baseline-bundle-size.json`. CI also gates on `pnpm check:all` (knip + jscpd + depcheck).

⚠️ **The size check scores the eager import closure, not "chunks the HTML names"** (changed 2026-08-03). Rollup splits the entry into a re-export shim under `refresh: 'render'`, so the old scoring read **77 bytes** and reported a 9 KB *improvement* on a build whose real payload had grown — a green tick on the exact regression the check exists to catch. Dynamic imports stay excluded on purpose; charging a page for bytes most readers never fetch makes the budget meaningless.

⚠️ **The jsdom sentinel is not jsdom-specific and cannot currently scan every chunk.** It is the xmlns namespace URI, which also appears in **d3-selection** — part of the client renderer `refresh: 'render'` legitimately ships — so widening the scan fails that build on a false positive. The renderer graph itself is clean: all 90 chunks checked 2026-08-03 for `parse5`, `nwsapi`, `cssstyle`, `SymbolTree`, `whatwg-url` and the literal `jsdom`, zero hits. A minification-surviving jsdom-specific marker would let the scan widen; the same string is hard-coded in the docusaurus, fumadocs and nextra assert scripts.

`pages.yml` rebuilds the same fixture with dgmo-content's all-chart-types page composed in, and publishes it to GitHub Pages.
