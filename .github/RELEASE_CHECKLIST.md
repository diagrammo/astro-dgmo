# Release Checklist — astro-dgmo

Every `chore: release vX.Y.Z` PR body MUST link to this checklist. Each item MUST be ticked before `git tag v* && git push --tags`.

## Pre-flight (local)

- [ ] `package.json` `version` matches the intended tag (without the `v` prefix).
- [ ] `package.json` deps on `remark-dgmo` are **`^x.y.z`** — no `file:` or `link:` left over from the dev loop.
- [ ] `package.json` has no `pnpm.overrides` key (the release workflow rejects it, but catch it here).
- [ ] `package.json` `peerDependencies["@diagrammo/dgmo"]` matches the current `remark-dgmo` peer pin (lockstep).
- [ ] `pnpm build` succeeded.
- [ ] `pnpm test` (unit tests) passed.
- [ ] `pnpm test:e2e` (fixture build + assert-build-output.mjs) passed.

## User-visible smoke (manual, ad-hoc)

The fixture build asserts HTML/CSS structure but not the actual toggle UX. Once per release, scaffold a real Astro site and eyeball it:

- [ ] `pnpm create astro@latest _smoke -- --template minimal --no-install --no-git` in a scratch dir.
- [ ] `pnpm pack` in this repo; install the tarball into `_smoke` (`pnpm add ../astro-dgmo-X.Y.Z.tgz @diagrammo/dgmo`).
- [ ] Wire the integration per README into `_smoke/astro.config.mjs` (plus the `import 'remark-dgmo/client.css'` in a layout).
- [ ] Add a sample `.md` page with a dgmo block and a `data-theme` toggle button.
- [ ] `pnpm dev` opens the page.
- [ ] Confirm the diagram **renders** (not raw fence text).
- [ ] Click the toggle — confirm the diagram visually switches between light and dark variants.

## Cross-package coordination

- [ ] `remark-dgmo@^0.X` is already on npm and your `dependencies.remark-dgmo` range resolves to it.
- [ ] If this is a v0.x.0 minor and `remark-dgmo` shipped a minor too, `docusaurus-plugin-dgmo` got a coordinated patch in the same release window.
- [ ] `@diagrammo/dgmo` peer pin matches what `remark-dgmo` declares — bump in lockstep when dgmo cuts a major.

## After the tag

- [ ] CI release workflow finished successfully (logs green; `npm view` confirms publish).
- [ ] GitHub release was auto-created and has reasonable auto-generated notes; edit if needed to surface the marquee feature.
- [ ] Bump consumer documentation if README install snippet changed.
