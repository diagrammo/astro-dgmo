import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import remarkDgmo from 'remark-dgmo';
import type { DgmoIntegrationOptions } from './options.js';

export type { DgmoIntegrationOptions, Mode, Theme } from './options.js';
export { default as remarkDgmo } from 'remark-dgmo';

/**
 * Astro integration that renders DGMO fenced code blocks at build time.
 *
 * @example
 * ```js
 * // astro.config.mjs
 * import dgmo from 'astro-dgmo';
 *
 * export default defineConfig({
 *   integrations: [dgmo()],
 * });
 * ```
 *
 * v0.3.0 changes the rendered HTML class-name prefix from `astro-dgmo-*` to
 * `dgmo-*`. Both are emitted for one minor cycle via the shared `remark-dgmo`
 * `legacyClassNames` option, so existing user CSS keeps working until v0.4.
 *
 * v0.3.0 also defaults to `colorMode: 'auto'` (dual-render, light+dark SVGs)
 * to fix the silent dark/light-mismatch bug on Starlight and any toggle-
 * enabled Astro site. Users on single-mode sites can opt back to single-render
 * by setting `colorMode: 'light'` or `colorMode: 'dark'` in the integration
 * options.
 *
 * **CSS:** Astro 6's IntegrationHook has no programmatic stylesheet
 * injection — only `injectScript`. You must import the color-mode stylesheet
 * yourself in a global layout (e.g. `src/layouts/Base.astro`):
 *
 *     import 'remark-dgmo/client.css';
 */
export default function dgmoIntegration(
  options: DgmoIntegrationOptions = {}
): AstroIntegration {
  // Emit BOTH new (`dgmo-*`) and legacy (`astro-dgmo-*`) class names so user
  // CSS targeting the v0.2 classes keeps working. Removed in v0.4.
  const optionsWithLegacy: DgmoIntegrationOptions = {
    ...options,
    legacyClassNames: [
      ...(options.legacyClassNames ?? []),
      'astro-dgmo',
      'astro-dgmo-card',
    ],
  };

  return {
    name: 'astro-dgmo',
    hooks: {
      'astro:config:setup'({ updateConfig, injectScript }) {
        updateConfig({
          markdown: {
            remarkPlugins: [[remarkDgmo, optionsWithLegacy]],
          },
        });
        // Inline the shared remark-dgmo client script so showcase-mode copy
        // buttons + viewBox tightening light up without users wiring scripts
        // manually. Read at config-setup time so the absolute path resolves
        // through node_modules.
        const clientJsPath = fileURLToPath(
          import.meta.resolve('remark-dgmo/client.js')
        );
        injectScript('page', readFileSync(clientJsPath, 'utf8'));

        // Cloud references, `refresh: 'render'` only (story 10.4). The base
        // client NOTICES that a referenced diagram moved; this second module is
        // what re-renders it, and it is separate because its dynamic import is
        // static-analyzable — injecting it unconditionally took this repo's own
        // fixture from 1 chunk / 7,990 gzipped bytes to 90 chunks / 634,199.
        // Lazy for the reader, not free for the site, so it is opt-in.
        if (options.references?.refresh === 'render') {
          const renderJsPath = fileURLToPath(
            import.meta.resolve('remark-dgmo/client-render.js')
          );
          injectScript('page', readFileSync(renderJsPath, 'utf8'));
        }
      },
    },
  };
}
