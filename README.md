# astro-dgmo

Render [DGMO](https://diagrammo.app) diagrams from fenced code blocks in your Astro site at build time. Powered by [`@diagrammo/dgmo`](https://www.npmjs.com/package/@diagrammo/dgmo) and the framework-agnostic [`remark-dgmo`](https://www.npmjs.com/package/remark-dgmo) core. Zero client JavaScript by default.

📖 **Setup guide:** [diagrammo.app/embed#astro](https://diagrammo.app/embed#astro) · 🔭 **Live showcase:** [every chart type rendered through astro-dgmo](https://diagrammo.github.io/astro-dgmo/) — every block is in showcase mode, so hovering a diagram reveals its copy / open-in-editor footer.

```dgmo
sequence
Client -POST /login-> API
API -validate-> Auth
Auth -JWT-> API
API -200 OK-> Client
```

…in any `.md` or `.mdx` file becomes a beautifully rendered SVG, inlined into the page. Every diagram is rendered twice at build time (light + dark palettes) and follows the host's color-mode toggle via shipped CSS.

<p align="center">
  <a href="https://diagrammo.app"><img src="https://diagrammo.app/readme/sequence.gif" alt="A DGMO diagram authored as plain text" width="100%"></a>
  <br>
  <em>Write a fenced <code>dgmo</code> block — it renders to SVG at build time.</em>
</p>

## Chart types & visual authoring

One small plain-text language, **45 chart types** — flowcharts, sequence, state, class, ER, C4, org charts, gantt, maps, mind maps, and the full bar/line/pie/area/sankey family. Browse every type with live examples in the **[language reference](https://diagrammo.app/reference)**.

Prefer to author visually? Draft diagrams in the **[Diagrammo desktop app](https://diagrammo.app/app)** or the **[online editor](https://online.diagrammo.app)** — live preview, autocomplete, optional vim keybindings, 7 themeable palettes, and one-click PNG/SVG export — then paste the `dgmo` block into your docs. More at **[diagrammo.app](https://diagrammo.app)**.

## Install

```bash
pnpm add astro-dgmo @diagrammo/dgmo
# or
npm install astro-dgmo @diagrammo/dgmo
```

`@diagrammo/dgmo` is a peer dependency.

### On Astro 7, add one more package

```bash
pnpm add @astrojs/markdown-remark
```

Astro 7 changed its default Markdown processor to Sätteri, which does not run
remark plugins — and diagrams are rendered by one. Without this package Astro
stops the build and tells you to install it.

With it installed there is nothing else to do: `astro-dgmo` puts the site back
on the `unified` processor it has always rendered through, so Markdown behaves
exactly as it did on Astro 6, and prints a one-line notice saying it did. If you
would rather own that yourself, configure `unified` and the integration adds
itself to your processor instead of replacing it:

```js
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  markdown: { processor: unified() },
  integrations: [dgmo()],
});
```

Astro 4, 5 and 6 need none of this.

## Quick start

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import dgmo from 'astro-dgmo';

export default defineConfig({
  integrations: [dgmo()],
});
```

That's the whole integration — no stylesheet to wire up, no layout to edit. (Before 0.11.0 you had to add `import 'remark-dgmo/client.css'` to a global layout yourself, and a site that skipped it rendered every diagram twice.) Anywhere in your Markdown or MDX content, write a fenced block with the language `dgmo`:

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
| `source` / `noSource`                                   | Force source view + toggle on/off   |
| `copy` / `noCopy`                                       | Force copy button on/off            |
| `expand` / `noExpand`                                   | Force expand (full-screen) on/off   |
| `openInEditor` / `noOpenInEditor`                       | Force editor link on/off            |

See the [`remark-dgmo` README](https://github.com/diagrammo/remark-dgmo) for the full option matrix.

## Live links (on by default)

A fence can name a published [Diagrammo Cloud](https://diagrammo.app) diagram
instead of carrying its own source, so the page stops going stale the day it is
written:

````md
```dgmo
live-link dgm_01HQ3RSTUV
```
````

No configuration needed — this resolves out of the box. To stop your build
fetching anything:

```js
// astro.config.mjs
integrations: [dgmo({ liveLink: { enabled: false } })];
```

Switched off, the fence renders a small card naming the diagram and linking
through to it, plus a hover-revealed _"Show this diagram here"_ link to the
guide, and the build warns. See the
[live links guide](https://diagrammo.app/docs/live-links/).

The build resolves it, renders it exactly like any other block, and writes what
it fetched to `.dgmo/references/<id>.json` — **commit that directory.** It is
what makes your build reproducible, offline-capable, and independent of our
uptime: if we are unreachable, the site builds from the committed copy and warns.

⚠️ **If your site sets a Content-Security-Policy it must allow
`connect-src https://api.diagrammo.app`.** Without it the diagram still renders
(it was baked at build time) but never refreshes, and nothing can report that —
the report would be blocked too.

### When a diagram changes after you build

By default the page **notices** — a small link to the live diagram — rather than
re-rendering it. Re-rendering means shipping the dgmo renderer in your bundle,
and on this repo's own fixture that is the difference between **1 chunk / 8.9 KB
gzipped and 88 chunks / 634 KB**. Lazy for your readers; not free for your
`dist/`.

Opt in if your diagrams change far more often than your site rebuilds:

```js
integrations: [dgmo({ liveLink: { refresh: 'render' } })];
```

The full behaviour, including what each kind of failure does to your build, is in
the [`remark-dgmo` README](https://github.com/diagrammo/remark-dgmo#live-links-on-by-default).

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

Under the default `colorMode: 'auto'` each fence renders **two** SVGs, light and dark. `remark-dgmo/client.css` is what hides the one you are not currently in, and since 0.11.0 the integration delivers it for you: `injectScript('page-ssr', "import 'remark-dgmo/client.css';")` imports the module into every page's frontmatter, and Astro's Vite pipeline turns that into a `<style>` block in `<head>` (or a linked stylesheet above its inline threshold).

Opt out with `dgmo({ injectClientCss: false })` if you ship your own copy of the color-mode rules. Importing the stylesheet yourself as well is harmless — Vite resolves both to one module.

**Why this changed.** Through 0.10.x the import was a manual step, and this README called it unavoidable on the grounds that Astro's `IntegrationHook` has no stylesheet API. That premise is true and the conclusion was wrong: `page-ssr` is the route [Astro's own integration reference](https://docs.astro.build/en/reference/integrations-reference/) documents for injecting CSS. Meanwhile a site that did not know to add the line rendered the same diagram twice, stacked, with a green build and no warning anywhere.

A small client script (~600 bytes) is injected via `injectScript('page', …)`. It tightens each diagram's `viewBox` to its content bounds and binds showcase-mode copy buttons. If your site forbids inline scripts via CSP, ignore this script — diagrams still render, but layout may have extra whitespace and copy buttons won't function.

## Custom color-mode selector

The shipped stylesheet keys dark mode on **both** conventions, so nothing is needed for either of these:

- `data-theme="dark"` on `<html>` — Starlight, Docusaurus
- `class="dark"` on `<html>` — Tailwind, next-themes

If your site marks dark mode some third way (`data-color-scheme="dark"`, `:root[data-mode="dark"]`), add the pair of rules with your own selector — no need to opt out of the injected stylesheet, since these simply layer on top:

```css
[data-mode='dark'] .dgmo-light {
  display: none;
}
[data-mode='dark'] .dgmo-dark {
  display: block;
}
```

If your site has no dark mode at all, you get the light diagram and nothing else to do: the dark wrapper ships with the `hidden` attribute, so it stays hidden until one of the rules above overrides it.

## How it works

1. The Astro integration registers a remark plugin via `astro:config:setup`, inline-injects the `remark-dgmo` client script via `injectScript('page', …)`, and adds the color-mode stylesheet via `injectScript('page-ssr', …)`.
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

**Class names changed.** The rendered HTML class-name prefix changed from `astro-dgmo-*` to `dgmo-*` (e.g., `astro-dgmo` → `dgmo`). For one minor cycle (v0.3.x) we emit BOTH so existing CSS keeps working. v0.4 drops the legacy aliases. If you have CSS or DOM walkers targeting `astro-dgmo-*` classes, update them now to the `dgmo-*` equivalents.

### Upgrading to 0.6.0

v0.6 adopts the standard DGMO embed block (via remark-dgmo 0.5): the `dgmo-card` class is removed, syntax-token classes are renamed to `dgmo-tok-*`, the source view now sits behind a native `<details>` (`dgmo-source-wrap`), and showcase chrome is a hover-revealed icon toolbar (`dgmo-toolbar-btn`, `dgmo-copy`, `dgmo-open`). If you have custom CSS targeting `dgmo-card` or old token classes, retarget it to the new class names.

No API changes. No breaking changes to fenced-block syntax or per-block options.

## License

MIT
