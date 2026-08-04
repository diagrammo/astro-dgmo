# Changelog

Releases before 0.7.0 are documented at
https://github.com/diagrammo/astro-dgmo/releases

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
diagram and linking through to it, plus a hover-revealed *"Show this diagram
here"* link to the guide and a build warning naming the option and the source
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
