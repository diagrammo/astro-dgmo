# astro-dgmo

Render [DGMO](https://diagrammo.app) diagrams from fenced code blocks in your Astro site at build time. Powered by [`@diagrammo/dgmo`](https://www.npmjs.com/package/@diagrammo/dgmo). Zero client JavaScript by default.

```dgmo
chart: sequence
Client -POST /login-> API
API -validate-> Auth
Auth -JWT-> API
API -200 OK-> Client
```

…in any `.md` or `.mdx` file becomes a beautifully rendered SVG, inlined into the page.

## Install

```bash
pnpm add astro-dgmo @diagrammo/dgmo
# or
npm install astro-dgmo @diagrammo/dgmo
```

`@diagrammo/dgmo` is a peer dependency.

## Use

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import dgmo from 'astro-dgmo';

export default defineConfig({
  integrations: [dgmo()],
});
```

That's it. Anywhere in your Markdown or MDX content, write a fenced block with the language `dgmo`:

````markdown
```dgmo
chart: pie
TypeScript: 45
Python: 30
Rust: 25
```
````

At build time, the block is replaced with an inline `<svg>` wrapped in a `<figure class="astro-dgmo astro-dgmo--diagram">`. No client JavaScript is shipped unless you opt into showcase mode.

## Options

```js
dgmo({
  // Output mode for `dgmo` blocks. 'diagram' (default) renders just the SVG.
  // 'showcase' renders syntax-highlighted source + diagram + copy + open-in-editor.
  mode: 'diagram',

  // Defaults for the `render()` call from @diagrammo/dgmo.
  palette: 'nord',     // any registered palette
  theme: 'dark',       // 'light' | 'dark' | 'transparent'

  // Showcase chrome — enabled automatically in showcase mode.
  showSource: undefined,        // boolean; default = (mode === 'showcase')
  showCopy: undefined,          // boolean; default = (mode === 'showcase')
  showOpenInEditor: undefined,  // boolean; default = (mode === 'showcase')

  // Where the "Open in editor" link points.
  editorBaseUrl: 'https://online.diagrammo.app',

  // Outer wrapper element + class hook.
  wrapper: 'figure',  // 'figure' | 'div'
  className: 'astro-dgmo',
});
```

## Per-block overrides

Append options to the fence info string. Tokens are space-separated; values may be quoted.

````markdown
```dgmo showcase title="Login flow" palette=catppuccin theme=light
chart: sequence
A -> B
```
````

Recognized tokens:

| Token | Effect |
|---|---|
| `diagram` / `showcase` | Set `mode` for this block |
| `palette=<name>` | Override palette |
| `theme=light` / `theme=dark` / `theme=transparent` | Override theme |
| `title="…"` | Add a caption (`<figcaption>`) |
| `source` / `noSource` | Force source listing on/off |
| `copy` / `noCopy` | Force copy button on/off |
| `openInEditor` / `noOpenInEditor` | Force editor link on/off |

## Showcase mode

For docs sites and tutorials where you want the source visible alongside the rendered diagram (with copy and "Open in online editor" affordances), set `mode: 'showcase'` globally — every `dgmo` block becomes a rich showcase:

```js
dgmo({ mode: 'showcase' });
```

Or opt-in per block:

````markdown
```dgmo showcase
chart: kanban
Backlog: Item 1, Item 2
Doing: Item 3
Done: Item 4
```
````

## Styling

The plugin emits semantic class names and inline syntax-highlight styles only. Bring your own CSS to skin the showcase chrome — recommended hooks:

```css
.astro-dgmo { /* outer wrapper */ }
.astro-dgmo--diagram { /* simple mode */ }
.astro-dgmo--showcase { /* showcase mode */ }
.astro-dgmo-caption { /* title/caption */ }
.astro-dgmo-svg { /* svg container */ }
.astro-dgmo-card { /* showcase card */ }
.astro-dgmo-source-wrap, .astro-dgmo-source-inner { /* source block */ }
.astro-dgmo-toolbar { /* "dgmo" label + action icons (single row) */ }
.astro-dgmo-toolbar-label { /* "dgmo" tag */ }
.astro-dgmo-toolbar-actions { /* container for the icon buttons */ }
.astro-dgmo-toolbar-btn { /* shared style for both icon buttons */ }
.astro-dgmo-open { /* "Open in online editor" external-link icon */ }
.astro-dgmo-copy { /* copy-to-clipboard icon */ }
.astro-dgmo-copy--success { /* copy button after a successful copy */ }
.astro-dgmo-pre, .astro-dgmo-code { /* highlighted source */ }
```

The SVG output also includes a small inline script (~600 bytes) that tightens each diagram's `viewBox` to its content bounds and wires up copy buttons. If your site forbids inline scripts via CSP, ignore this script — diagrams still render, but layout may have extra whitespace and copy buttons won't function.

## Direct remark plugin

For fine-grained control (or to use outside Astro), import the remark plugin directly:

```js
import remarkDgmo from 'astro-dgmo/remark';

// e.g. in any remark/rehype pipeline:
unified()
  .use(remarkParse)
  .use(remarkDgmo, { mode: 'showcase', palette: 'dracula' })
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(source);
```

## How it works

1. The Astro integration registers a remark plugin via `astro:config:setup`.
2. The remark plugin walks `.md`/`.mdx` ASTs after parse, finding `code` nodes whose `lang === 'dgmo'`.
3. Each block is rendered to an SVG string by calling `render()` from `@diagrammo/dgmo`. SVG width/height are stripped and a `viewBox` is added so the diagram scales responsively.
4. The original `code` node is replaced with an `html` node containing the rendered output.
5. A small inline page script tightens viewBoxes to actual content bounds and binds copy-button click handlers.

All rendering happens at build time. No diagram source is shipped to the browser unless you enable showcase mode (which inlines a syntax-highlighted copy of the source for display).

## License

MIT
