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
      async 'astro:config:setup'({ config, updateConfig, injectScript, logger }) {
        const plugin: [typeof remarkDgmo, DgmoIntegrationOptions] = [
          remarkDgmo,
          optionsWithLegacy,
        ];

        // 🔴 Astro 7 stopped running remark plugins, and does it QUIETLY.
        //
        // Sätteri replaced unified as the default Markdown processor, and
        // `markdown.remarkPlugins` is simply not consulted by it. The build
        // stays green, exits 0, and every diagram is gone — measured on this
        // repo's own fixture 2026-08-10: 423,794 bytes and 14 SVGs became
        // 6,625 bytes and 1. Astro prints one warning and carries on.
        //
        // So this hook asks what processor it has rather than assuming, and
        // says out loud what it did. Feature detection, not a version check:
        // `processor` does not exist in Astro 4-6's config at all, and
        // `unified`/`isUnifiedProcessor` are only exported by the Astro 7 line
        // of `@astrojs/markdown-remark`, so the two together identify the new
        // world without anyone parsing a version string.
        const markdownRemark = await import('@astrojs/markdown-remark').catch(
          () => undefined
        );
        const unified = markdownRemark?.unified;
        const isUnifiedProcessor = markdownRemark?.isUnifiedProcessor;
        const processor = (
          config?.markdown as { processor?: { name?: string } } | undefined
        )?.processor;

        if (!unified || !isUnifiedProcessor || processor === undefined) {
          // Astro 4-6: remark IS the Markdown pipeline, so this is all it takes.
          updateConfig({ markdown: { remarkPlugins: [plugin] } });
        } else if (isUnifiedProcessor(processor as { name: string })) {
          // The site already runs unified. Push into it rather than replacing
          // it — replacing would silently drop every other plugin they set.
          (
            processor as { options: { remarkPlugins: unknown[] } }
          ).options.remarkPlugins.push(plugin);
        } else {
          // 🔴 Something else is configured — Sätteri, or a third processor.
          //
          // We take it over, because the alternative is rendering nothing, and
          // unified is the engine this integration has always run on: a site
          // arriving from Astro 6 gets the Markdown semantics it already had.
          //
          // 🔴 Carry the whole pipeline, not just our plugin. Integrations
          // that ran before us — Starlight, most importantly — have already
          // pushed their remark and rehype plugins into `config.markdown`,
          // where the processor being replaced never looked. Neither did the
          // first version of this takeover, which rebuilt the pipeline as
          // `[plugin]` alone: Starlight's `:::note` asides are remark
          // plugins, so every aside on a Starlight site rendered as literal
          // `:::` text while the diagrams worked (issue 191, 2026-08-11).
          // The site's own gfm / smartypants / remarkRehype settings ride
          // along for the same reason — the takeover's contract is "your
          // Markdown, plus diagrams", never "our Markdown instead".
          //
          // It is announced rather than done quietly, and that is not
          // squeamishness — Astro materialises its DEFAULT processor before
          // integrations run (verified 2026-08-10: `config.markdown.processor`
          // is already `satteri` inside this hook on a config that never
          // mentioned it). So "the site asked for Sätteri" and "the site asked
          // for nothing" are indistinguishable here, and a silent swap would
          // sometimes be overruling a real choice with no way to notice.
          const md = (config?.markdown ?? {}) as {
            remarkPlugins?: unknown[];
            rehypePlugins?: unknown[];
            remarkRehype?: Record<string, unknown>;
            gfm?: boolean;
            smartypants?: boolean;
          };
          // 🔴 An integration that ran BEFORE us may have registered plugins
          // into the processor being replaced — Starlight, when it sees
          // Sätteri, pushes its aside/anchor plugins into the processor's own
          // `mdastPlugins`/`hastPlugins` rather than into `config.markdown`,
          // and those cannot be carried onto unified(). We cannot fix that
          // from here; we CAN name it and name the fix, because the silent
          // version of this was a Starlight site whose every `:::` aside
          // rendered as plain text (issue 191). Listing dgmo() before those
          // integrations makes them find the unified processor already in
          // place and join it through their own unified support.
          const opts = (
            processor as {
              options?: { mdastPlugins?: unknown[]; hastPlugins?: unknown[] };
            }
          ).options;
          const strandedCount =
            (opts?.mdastPlugins?.length ?? 0) + (opts?.hastPlugins?.length ?? 0);
          if (strandedCount > 0) {
            logger.warn(
              `The \`${(processor as { name?: string })?.name ?? 'configured'}\` processor being replaced already ` +
                `carries ${strandedCount} plugin(s) registered by integrations that ran before astro-dgmo ` +
                `(Starlight registers its \`:::\` asides this way). Those plugins CANNOT be carried over and ` +
                `their output will be missing. Fix: list dgmo() BEFORE those integrations in \`integrations: []\`, ` +
                `so they find the unified() processor already in place and join it instead.`
            );
          }
          const carried = {
            remarkPlugins: [...(md.remarkPlugins ?? []), plugin],
            rehypePlugins: [...(md.rehypePlugins ?? [])],
            ...(md.remarkRehype !== undefined && {
              remarkRehype: md.remarkRehype,
            }),
            ...(md.gfm !== undefined && { gfm: md.gfm }),
            ...(md.smartypants !== undefined && {
              smartypants: md.smartypants,
            }),
          };
          logger.warn(
            `astro-dgmo renders diagrams through a remark plugin, which your ` +
              `\`${(processor as { name?: string })?.name ?? 'configured'}\` Markdown processor does not run. ` +
              `Switching \`markdown.processor\` to \`unified()\` so diagrams render, ` +
              `carrying the ${md.remarkPlugins?.length ?? 0} remark and ` +
              `${md.rehypePlugins?.length ?? 0} rehype plugins already registered. ` +
              `To keep your own processor and control this yourself, set ` +
              `\`markdown: { processor: unified({ remarkPlugins: [[remarkDgmo, options]] }) }\` ` +
              `— astro-dgmo will then add itself to that processor instead of replacing it.`
          );
          updateConfig({
            markdown: {
              processor: unified(carried as Parameters<typeof unified>[0]),
            },
          });
        }
        // Inline the shared remark-dgmo client script so showcase-mode copy
        // buttons + viewBox tightening light up without users wiring scripts
        // manually. Read at config-setup time so the absolute path resolves
        // through node_modules.
        const clientJsPath = fileURLToPath(
          import.meta.resolve('remark-dgmo/client.js')
        );
        injectScript('page', readFileSync(clientJsPath, 'utf8'));

        // Live links, `refresh: 'render'` only (story 10.4). The base
        // client NOTICES that a referenced diagram moved; this second module is
        // what re-renders it, and it is separate because its dynamic import is
        // static-analyzable — injecting it unconditionally took this repo's own
        // fixture from 1 chunk / 7,990 gzipped bytes to 90 chunks / 634,199.
        // Lazy for the reader, not free for the site, so it is opt-in.
        if (options.liveLink?.refresh === 'render') {
          const renderJsPath = fileURLToPath(
            import.meta.resolve('remark-dgmo/client-render.js')
          );
          injectScript('page', readFileSync(renderJsPath, 'utf8'));
        }
      },
    },
  };
}
