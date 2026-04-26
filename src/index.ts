import type { AstroIntegration } from 'astro';
import remarkDgmo from './remark-plugin.js';
import type { DgmoIntegrationOptions } from './options.js';

export type { DgmoIntegrationOptions, Mode, Theme } from './options.js';
export { default as remarkDgmo } from './remark-plugin.js';

const CLIENT_SCRIPT = `
(() => {
  if (typeof document === 'undefined') return;
  const COPY_SEL = 'button.astro-dgmo-copy';
  function bindCopy() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest && e.target.closest(COPY_SEL);
      if (!btn) return;
      const src = btn.dataset.astroDgmoSource || '';
      try { await navigator.clipboard.writeText(src); } catch { return; }
      btn.classList.add('astro-dgmo-copy--success');
      setTimeout(() => btn.classList.remove('astro-dgmo-copy--success'), 1500);
    });
  }
  function tighten() {
    document.querySelectorAll('.astro-dgmo-svg svg').forEach((svg) => {
      try {
        const bbox = svg.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          const pad = 16;
          svg.setAttribute('viewBox',
            (bbox.x - pad) + ' ' + (bbox.y - pad) + ' ' +
            (bbox.width + pad * 2) + ' ' + (bbox.height + pad * 2)
          );
        }
      } catch (_) {}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bindCopy(); tighten(); });
  } else { bindCopy(); tighten(); }
})();
`.trim();

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
 */
export default function dgmoIntegration(
  options: DgmoIntegrationOptions = {}
): AstroIntegration {
  return {
    name: 'astro-dgmo',
    hooks: {
      'astro:config:setup'({ updateConfig, injectScript }) {
        updateConfig({
          markdown: {
            remarkPlugins: [[remarkDgmo, options]],
          },
        });
        injectScript('page', CLIENT_SCRIPT);
      },
    },
  };
}
