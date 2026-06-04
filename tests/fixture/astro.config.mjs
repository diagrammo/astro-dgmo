import { defineConfig } from 'astro/config';
import dgmo from 'astro-dgmo';

// `base` is env-gated so the e2e fixture build (no env) stays at root and its
// committed bundle-size baseline holds. The Pages workflow sets PAGES_BASE to
// the repo subpath so assets resolve under github.io/<repo>/.
export default defineConfig({
  site: 'https://diagrammo.github.io',
  base: process.env.PAGES_BASE || '/',
  integrations: [dgmo()],
});
