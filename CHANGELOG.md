# Changelog

Releases before 0.7.0 are documented at
https://github.com/diagrammo/astro-dgmo/releases

## 0.11.5

**Verified against `@diagrammo/dgmo` 0.83.0 and `remark-dgmo` 0.15.5.** In this
package's manifest the `@diagrammo/dgmo` range moves to `>=0.83.0 <1`. That
move is the release: an open range npm has already satisfied is never
re-resolved, so the previous version was built and tested against
whatever it happened to have installed rather than against what this workspace
publishes.

What 0.83.0 brings to a rendered page: a `boxes-and-lines` diagram built on a
busy machine no longer comes out as the layout engine's error text — a crowded
edge label is now preferred over no picture at all — and `is a cloud` and `is a
queue` draw a cloud and a queue, where both had been drawing the same rounded
rectangle as a node with no shape override at all.

## 0.11.4

**Diagrams were blank in dark mode on a Tailwind v4 site.** A dual-render fence
ships a light SVG and a dark one and lets the stylesheet pick; the dark wrapper
carried the `hidden` attribute so a site that never loaded the stylesheet showed
one diagram rather than two. Tailwind v4's preflight hides `[hidden]` with
`!important` from inside `@layer base`, and for important declarations a layered
rule outranks an unlayered one at any specificity — so the reveal could not win
at any strength, and the block collapsed to a zero-height empty box.

Tracks `@diagrammo/dgmo` 0.82.0 and `remark-dgmo` 0.15.4, which hide the dark
wrapper with an inline `display: none` and reveal it with `!important`. **If you
wrote your own color-mode selector**, add `!important` to your `display: block`
rule — an inline declaration outranks every normal author rule.

## 0.11.3

**Verified against `@diagrammo/dgmo` 0.81.0 and `remark-dgmo` 0.15.3.** The
`remark-dgmo` dependency moves to `>=0.15.3 <1` and the `@diagrammo/dgmo` range
this package builds against to `>=0.81.0 <1`. Those moves are the release: a
range that is already satisfied is never re-resolved, so the last version was
built and tested against what it happened to have installed rather than against
what this workspace publishes.

What 0.81.0 brings to a rendered page: boxes-and-lines arrowheads are no longer
painted at the node centres under the boxes they point at, an edge label lands
on the line it names, a two-way pair of edges stops drawing as an X, `color:`
on an edge reaches the stroke, and a numbered heatmap row label is read as a
label rather than the row's first value.

## 0.11.2

**Verified against `@diagrammo/dgmo` 0.79.0 and `remark-dgmo` 0.15.2.** The
`remark-dgmo` dependency moves to `>=0.15.2 <1` and the `@diagrammo/dgmo` range
this package builds against to `>=0.79.0 <1`. Those moves are the release: a
range that is already satisfied is never re-resolved, so the last version was
still being built and tested against 0.77.0.

Nothing in this package's own source changes. What readers get is three
releases of the library. Every chart type was brought onto one visual language,
so a border, a shadow and a type weight mean the same thing wherever they
appear — which included making the error card's docs link bold, the one
declaration `remark-dgmo`'s stylesheet copy had drifted on. A group line can
carry a tag value and the group's frame takes that value's colour, in
boxes-and-lines, infra, kanban, c4, state and pert; a c4 diagram now names a
tag group nobody has switched to instead of drawing it as nothing at all; and a
long identifier wraps where a reader would break it — after an underscore or
hyphen, and between the words of camelCase — rather than being chopped
mid-word.

### Changed

- Formatting only, across the files that had drifted from Prettier, and
  `format:check` now runs on every push so the next drift fails there instead
  of accumulating.

## 0.11.0

**Verified against `@diagrammo/dgmo` 0.76.0 and `remark-dgmo` 0.15.0.** Both are
required rather than incidental: 0.76.0 is what emits the dark wrapper's
`hidden` attribute, and 0.15.0 is what keys the stylesheet on `html.dark` as
well as `[data-theme="dark"]`. The `remark-dgmo` dependency moves to `^0.15.0`
— on a `0.x` version a caret locks the minor, so `^0.14.7` would have kept
every consumer on the old stylesheet.

### Fixed

- **The color-mode stylesheet is injected for you — a fresh install no longer
  renders every diagram twice.** Under the default `colorMode: 'auto'` each
  fence produces two SVGs, light and dark, and `remark-dgmo/client.css` is the
  only thing that hides the one you are not in. Importing it was a manual step
  in a global layout, and a site that did not know to add that line printed the
  same diagram twice, stacked, on a green build with no warning anywhere. The
  integration now does it via `injectScript('page-ssr', "import
'remark-dgmo/client.css';")`.
- **The reason it was manual was wrong.** This package asserted that Astro's
  `IntegrationHook` has no stylesheet API and therefore the manual step was
  unavoidable. The premise holds; the conclusion did not — `page-ssr` imports a
  module into every page's frontmatter and Vite emits it as a real stylesheet,
  which is the route Astro's own integration reference documents for CSS.
  Measured on this repo's fixture under Astro 7.2.0: a probe page importing
  nothing carried zero stylesheets before the change and the color-mode rules
  after.

### Added

- **`injectClientCss`** (default `true`). Set `false` if you ship your own copy
  of the color-mode rules. Importing the stylesheet yourself as well is
  harmless — Vite resolves both to one module.

### Changed

- The built page is now asserted to carry the dark wrapper's `hidden`
  attribute, and never the light wrapper's. That is the floor beneath the
  stylesheet: even a consumer who opts out of the injection sees one diagram
  rather than two.
- `tests/fixture/src/layouts/Base.astro` no longer imports the stylesheet, so
  `scripts/assert-build-output.mjs` is now testing the injection rather than
  the layout. Its CSS assertion checks two independent facts — the dark wrapper
  is hidden by default, and some dark-mode rule reveals it — instead of one
  regex pinned to a single minified selector list.

## 0.10.5

**Verified against `@diagrammo/dgmo` 0.75.0 and `remark-dgmo` 0.14.7.** The dev range moves to
`>=0.75.0 <1`; the peer range is untouched, because no new subpath import was
added and that floor is set by imports rather than by recency.
The `remark-dgmo` dependency moves to `^0.14.7`, so what the fixture builds
against is what this release was checked on — a range that already matches what
is installed is never re-resolved, which is the only reason a declaration has to
move at all.

Nothing in this package's own source changes. What readers get is dgmo 0.75.0:
a PERT chart no longer draws its Summary card, stating its headline once in the
subtitle instead, and a collapsed sequence group's corners no longer blob.

## 0.10.4

The Astro dev server stops racing a startup deadline that only agents were
subject to (#363), and the test fixture's favicon catches up with the rest of
the workspace (#349).

## 0.10.3

**Verified against `@diagrammo/dgmo` 0.72.0 and `remark-dgmo` 0.14.5.** The dev
range moves to `>=0.72.0 <1` and the `remark-dgmo` dependency to `^0.14.5`, so
what the fixture builds against is what this release was checked on — a range
that already matches what is installed is never re-resolved, which is the only
reason the declaration has to move at all. The peer range is untouched: no new
subpath import was added.

## 0.10.2

**Verified against `@diagrammo/dgmo` 0.71.0 and `remark-dgmo` 0.14.4**, which is
newer than what this package had actually been building against.

The dev/dependency ranges had been left where a satisfied range stops
re-resolving: `>=0.66.0 <1` and `^0.14.2` were both still satisfied by the
versions already in the lockfile, so a plain install never reached for anything
newer and the fixture went on building against dgmo **0.66.0** and `remark-dgmo`
**0.14.3**. The ranges now name the versions the build is actually checked
against, and the lockfile resolves to them.

The `@diagrammo/dgmo` peer range is deliberately unchanged. A peer floor here
is set by which dgmo subpaths the code imports, and no import changed — raising
it would force adopters onto a newer dgmo for nothing.

## 0.10.1

🔴 **The Astro 7 takeover no longer discards the rest of your Markdown
pipeline** (issue 191 on `diagrammo/diagrammo`, found one day after 0.10.0
shipped it).

When 0.10.0 replaced an incompatible processor (Sätteri) with `unified()`, it
rebuilt the pipeline with only its own plugin — dropping every remark and
rehype plugin other integrations had registered in `config.markdown`, plus the
site's `gfm`/`smartypants`/`remarkRehype` settings. On a Starlight site the
symptom was every `:::` aside rendering as literal `:::` text while the
diagrams worked. The takeover now carries all of it, theirs first, and the
warning counts what it carried.

⚠️ **What it still cannot save — and now warns about:** plugins living inside
the replaced processor's own options. Starlight on Astro 7 registers its aside
plugins into the Sätteri processor directly, so if Starlight runs before
`dgmo()`, those plugins are lost with the processor. The fix is ordering: list
`dgmo()` **before** Starlight (or any Markdown-registering integration) in
`integrations: []` — they then find the `unified()` processor already in place
and join it through their own unified support. The takeover detects the
stranded plugins and prints exactly that.

## 0.10.0

🔴 **Diagrams survive Astro 7.** Astro 7 made Sätteri its default Markdown
processor, and Sätteri does not run remark plugins — so every diagram vanished
from a build that still exited 0. The `astro:config:setup` hook now asks what
processor it has: Astro 4–6 keep the old `markdown.remarkPlugins` path, a
`unified()` processor is joined rather than replaced, and anything else is
taken over with `unified()` plus a warning naming what was displaced.

(Entry back-filled on 2026-08-11; 0.10.0 shipped 2026-08-10 without one.)

## 0.9.2

🔴 **The `@diagrammo/dgmo` peer floor rises to `>=0.61.0 <1`, correcting a range
this package could not honour.**

It advertised `>=0.60.0 <1` while depending on `remark-dgmo ^0.14.0`, which now
resolves to 0.14.2 — and that imports `parseCloudReferenceFence`, which first
ships in dgmo **0.61.0**. So a site pinned to dgmo 0.60.x installed a combination
this package called supported, and got a module-resolution error:

```
SyntaxError: The requested module '@diagrammo/dgmo/cloud-reference'
does not provide an export named 'parseCloudReferenceFence'
```

npm cannot catch this — nothing validates a peer range against the peers of your
own dependencies — so stating the floor correctly is the only fix. Found
2026-08-06, when it took down a showcase build.

Nothing else changes in this release. The integration code is untouched; the
range was simply promising something it could not keep.

The `remark-dgmo` dependency moves to `^0.14.2` in the same breath, and the
test fixture is repinned off dgmo 0.60.0, which the new floor forbids.

## 0.9.1

**Takes `remark-dgmo` 0.14.0, where the step that asks the Cloud what a pointer
points at moved into dgmo itself.** Nothing about this integration changes: the
build resolves live links exactly as before, `.dgmo/references/` keeps its
format, and the failure table that decides whether a build stops is untouched.

🔴 **The `@diagrammo/dgmo` peer floor rises to `>=0.60.0 <1`.** 0.60.0 is the
release that adds the `@diagrammo/dgmo/live-link-resolve` subpath that
`remark-dgmo` 0.14.0 imports. On an older dgmo the failure is a module
resolution error in your build, not a warning here.

This is a patch and not a minor on purpose. **A caret on a `0.x` version locks
the minor**, so a site on `^0.9.0` can reach 0.9.1 and cannot reach 0.10.0 —
and a dependency-floor release that no existing site can install is the exact
problem this release exists to undo.

## 0.9.0

**🔴 Live links: renamed keyword, renamed option, and now ON by default.** All
three come from `remark-dgmo` and all three are visible to a site that upgrades
and changes nothing.

The fence keyword is now `live-link`:

````md
```dgmo
live-link dgm_01HQ3RSTUV
```
````

`cloud <id>` no longer resolves — not deprecated, simply no longer a live link.
Same for `![[cloud:<id>]]`, which becomes `![[live-link:<id>]]`.

The option is `liveLink`, not `references`, and it resolves by default:

```js
// this is now the DEFAULT — pass it only to turn live links OFF
integrations: [dgmo({ liveLink: { enabled: false } })];
```

🔴 **A site that upgrades and does nothing will start fetching from
`api.diagrammo.app` at build time**, and a `.dgmo/references/` directory will
appear in the repository wanting to be committed. That is correct by design —
the cache belongs in your repo so a clean CI checkout never depends on our
uptime — but it is an unexplained directory until you know why it is there.

With live links off, a `live-link` fence now renders a small card naming the
diagram and linking through to it, plus a hover-revealed _"Show this diagram
here"_ link to the guide and a build warning naming the option and the source
line. It is no longer an error block.

`refresh` is unchanged and still defaults to `notify`, so the renderer still
stays out of your bundle unless you ask for it.

## 0.8.0

**Cloud references (opt-in).** A `dgmo` fence can name a published Diagrammo
Cloud diagram instead of carrying its own source, so a page stops going stale
the day it is written:

```js
integrations: [dgmo({ references: { enabled: true } })];
```

The build resolves it, renders it like any other block, and writes what it
fetched to `.dgmo/references/<id>.json` — **commit that directory**. It is what
makes your build reproducible and independent of our uptime.

⚠️ **If your site sets a Content-Security-Policy it must allow
`connect-src https://api.diagrammo.app`**, or referenced diagrams will render
but never refresh — and nothing can report that, because the report would be
blocked too.

When a referenced diagram changes after you build, the page **notices** (a small
link to the live diagram) rather than re-rendering. Re-rendering ships the dgmo
renderer in your bundle: on this repo's own fixture that is 1 chunk / 8.9 KB
gzipped versus 88 chunks / 634 KB. Opt in with
`references: { refresh: 'render' }` if your diagrams change far more often than
your site rebuilds.

- `remark-dgmo` → `^0.11.0`; `@diagrammo/dgmo` peer → `>=0.57.0`.

## 0.7.0

Build against dgmo 0.53.0 via remark-dgmo 0.10.0 — decision #48 language
consistency. All legacy spellings still parse, so existing diagrams are
unaffected.

- `@diagrammo/dgmo` → `^0.53.0`, `remark-dgmo` → `^0.10.0`.
- Embed toolbar moved from the diagram's top-right to its bottom-right, so it
  no longer collides with a host's own top-right chart chrome.
- Behavior changes inherited from dgmo 0.53.0: boxes-and-lines prints values by
  default, tech-radar renders its blip listing by default, and treemap colors
  by heat before tags.
