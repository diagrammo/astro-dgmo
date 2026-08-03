import { defineConfig } from 'astro/config';
import dgmo from 'astro-dgmo';

// `base` is env-gated so the e2e fixture build (no env) stays at root and its
// committed bundle-size baseline holds. The Pages workflow sets PAGES_BASE to
// the repo subpath so assets resolve under github.io/<repo>/.
//
// LIVE_LINK_REFRESH=render is the Pages showcase only, and is gated on its OWN
// variable rather than on PAGES_BASE: "deployed under a subpath" and "redraws a
// stale diagram in the browser" are unrelated facts, and the e2e build must keep
// exercising the default that every adopter gets. The showcase turns it on
// because the page's whole argument is that the diagram is current — a notice
// saying it is not would be the one thing on the page that fails to demonstrate
// itself. Measured on this fixture 2026-08-03, showcase page composed in:
// eager page JS 9,135 → 9,875 gzipped bytes (+740), and 641 KB across 88 further
// chunks that are fetched ONLY when a diagram has actually changed. No
// modulepreload is emitted for them, verified against dist/index.html.
export default defineConfig({
  site: 'https://diagrammo.github.io',
  base: process.env.PAGES_BASE || '/',
  integrations: [
    dgmo(
      process.env.LIVE_LINK_REFRESH === 'render'
        ? { liveLink: { refresh: 'render' } }
        : {}
    ),
  ],
});
