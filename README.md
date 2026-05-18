# astro-dgmo

Render [DGMO](https://diagrammo.app) diagrams from fenced code blocks in your Astro site at build time. Powered by [`@diagrammo/dgmo`](https://www.npmjs.com/package/@diagrammo/dgmo) and the framework-agnostic [`remark-dgmo`](https://www.npmjs.com/package/remark-dgmo) core. Zero client JavaScript by default.

```dgmo
sequence
Client -POST /login-> API
API -validate-> Auth
Auth -JWT-> API
API -200 OK-> Client
```

…in any `.md` or `.mdx` file becomes a beautifully rendered SVG, inlined into the page. Every diagram is rendered twice at build time (light + dark palettes) and follows the host's color-mode toggle via shipped CSS.

## Install

```bash
pnpm add astro-dgmo @diagrammo/dgmo
# or
npm install astro-dgmo @diagrammo/dgmo
```

`@diagrammo/dgmo` is a peer dependency.

## Quick start

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import dgmo from 'astro-dgmo';

export default defineConfig({
  integrations: [dgmo()],
});
```

Then import `remark-dgmo/client.css` in a global layout — Astro 6's IntegrationHook has no programmatic stylesheet injection, so this manual step is unavoidable:

```astro
---
// src/layouts/Base.astro
import 'remark-dgmo/client.css';
---
```

That's the whole integration. Anywhere in your Markdown or MDX content, write a fenced block with the language `dgmo`:

````markdown
```dgmo
pie Language Mix
TypeScript 45
Python     30
Rust       25
```
````

At build time the block is replaced with an inline `<svg>` wrapped in a `<figure class="dgmo dgmo--diagram">`. No client JavaScript is shipped unless you opt into showcase mode.

Pass options to the integration to override defaults:

```js
dgmo({ mode: 'showcase', palette: 'catppuccin', colorMode: 'auto' });
```

See [`remark-dgmo`](https://www.npmjs.com/package/remark-dgmo) for the full options matrix — `astro-dgmo` forwards everything through.

## Per-block overrides

Append options to the fence info string. Tokens are space-separated; values may be quoted.

````markdown
```dgmo showcase title="Login flow" palette=catppuccin theme=light
sequence
A -> B
```
````

| Token                                                   | Effect                              |
| ------------------------------------------------------- | ----------------------------------- |
| `diagram` / `showcase`                                  | Set `mode` for this block           |
| `palette=<name>`                                        | Override palette                    |
| `theme=light` / `theme=dark` / `theme=transparent`      | Override theme (single-render only) |
| `colorMode=auto` / `colorMode=light` / `colorMode=dark` | Override color-mode strategy        |
| `title="…"`                                             | Add a caption (`<figcaption>`)      |
| `source` / `noSource`                                   | Force source listing on/off         |
| `copy` / `noCopy`                                       | Force copy button on/off            |
| `openInEditor` / `noOpenInEditor`                       | Force editor link on/off            |

See the [`remark-dgmo` README](https://github.com/diagrammo/remark-dgmo) for the full option matrix.

## Working reference site

[`tests/fixture/`](./tests/fixture/) is a complete minimal Astro 6 site running this integration. Copy [`tests/fixture/astro.config.mjs`](./tests/fixture/astro.config.mjs) + [`tests/fixture/src/layouts/Base.astro`](./tests/fixture/src/layouts/Base.astro) as a starting template.

```bash
git clone https://github.com/diagrammo/astro-dgmo
cd astro-dgmo
pnpm install && pnpm build
cd tests/fixture && pnpm install --no-frozen-lockfile && pnpm exec astro dev
```

Opens at http://localhost:4321 with four example diagrams (plain auto, colored tag sequence, showcase mode, per-block override) and a `data-theme` toggle for verifying the dark/light swap. See [`tests/fixture/README.md`](./tests/fixture/README.md) for details.

## How CSS is delivered

The shipped `remark-dgmo/client.css` contains three rules that hide the wrong-mode SVG based on `[data-theme="dark"]` on `<html>`. Astro's Vite pipeline inlines the import — a `<style>` block ends up in `<head>`, no separate stylesheet file is emitted. The required `import 'remark-dgmo/client.css'` in a global layout is what triggers that inlining; without it, both light and dark wrappers render at the same time.

A small client script (~600 bytes) is injected via `injectScript('page', …)`. It tightens each diagram's `viewBox` to its content bounds and binds showcase-mode copy buttons. If your site forbids inline scripts via CSP, ignore this script — diagrams still render, but layout may have extra whitespace and copy buttons won't function.

## Custom color-mode selector

The shipped `remark-dgmo/client.css` keys on `[data-theme="dark"]`. For Tailwind-style sites that use a `.dark` class on `<html>`, don't import that stylesheet — inline these three rules in your own CSS instead:

```css
.dgmo-dark {
  display: none;
}
html.dark .dgmo-light {
  display: none;
}
html.dark .dgmo-dark {
  display: block;
}
```

For other selectors (`data-color-scheme="dark"`, `:root[data-mode="dark"]`, etc.), same three rules with the selector swapped.

## How it works

1. The Astro integration registers a remark plugin via `astro:config:setup` and inline-injects the `remark-dgmo` client script via `injectScript('page', …)`.
2. The remark plugin walks `.md`/`.mdx` ASTs after parse, finding `code` nodes whose `lang === 'dgmo'`.
3. Each block is rendered to an SVG string by calling `render()` from `@diagrammo/dgmo` — once per theme under default `colorMode: 'auto'`, or once total under `'light'` / `'dark'`. Width/height are stripped and a `viewBox` is added so the diagram scales responsively.
4. The original `code` node is replaced with an `html` node containing the rendered wrapper(s).
5. The injected client script tightens viewBoxes after layout and binds copy-button click handlers.

All rendering happens at build time. No diagram source is shipped to the browser unless you enable showcase mode (which inlines a syntax-highlighted copy of the source for display).

## Migration

### Upgrading from 0.2.x to 0.3.0

**Heads up: this release doubles your SVG bytes by default** to fix a silent rendering bug on dark/light-toggle sites (Starlight, custom-toggle Astro sites).

v0.2 baked one palette per diagram at build time. If your site supported a dark/light toggle, half your readers saw a mismatched diagram. v0.3 fixes this by rendering each diagram twice (light + dark palettes) and using CSS to show the right one based on `[data-theme="dark"]` on `<html>`.

**Three paths:**

1. **Do nothing** — accept the ~2× SVG bytes per diagram in exchange for correct light/dark behavior. Recommended for Starlight and any site with a color-mode toggle.
2. **Opt out:** set `colorMode: 'light'` (or `'dark'`) in the integration options to keep the v0.2 single-render behavior. Recommended only if your site is single-mode.
3. **Use a different selector:** if your site signals dark mode via `.dark` class instead of `[data-theme="dark"]`, see "Custom color-mode selector" above.

**You must add a CSS import** to a global layout — see Quick start.

**Class names changed.** The rendered HTML class-name prefix changed from `astro-dgmo-*` to `dgmo-*` (e.g., `astro-dgmo-card` → `dgmo-card`). For one minor cycle (v0.3.x) we emit BOTH so existing CSS keeps working. v0.4 drops the legacy aliases. If you have CSS or DOM walkers targeting `astro-dgmo-*` classes, update them now to the `dgmo-*` equivalents.

No API changes. No breaking changes to fenced-block syntax or per-block options.

## License

MIT
