# Changelog

Releases before 0.7.0 are documented at
https://github.com/diagrammo/astro-dgmo/releases

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
