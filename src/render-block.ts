import { render, encodeDiagramUrl } from '@diagrammo/dgmo';
import { highlightDgmo, NORD_ROLE_STYLES } from '@diagrammo/dgmo/highlight';
import { resolveOptions, type DgmoIntegrationOptions } from './options.js';
import { parseFenceMeta } from './fence-meta.js';
import { normalizeSvg } from './svg-normalize.js';
import { escapeHtml, escapeAttr } from './escape.js';

export interface RenderBlockResult {
  html: string;
  diagnostics: Array<{ message: string; line?: number; severity?: string }>;
}

/**
 * Render a single ```dgmo block to inline HTML. Pure function: takes source +
 * options and returns the HTML string and any diagnostics from the parser.
 *
 * The remark plugin calls this for every matched code node.
 */
export async function renderDgmoBlock(
  source: string,
  meta: string | null | undefined,
  integrationOptions: DgmoIntegrationOptions = {}
): Promise<RenderBlockResult> {
  const block = parseFenceMeta(meta);
  const base = resolveOptions(integrationOptions);
  // Apply per-block overrides on top of integration defaults. If the block
  // changes mode, we re-resolve mode-dependent defaults from that mode unless
  // the block explicitly overrode them too.
  const effectiveMode = block.mode ?? base.mode;
  const showcase = effectiveMode === 'showcase';
  const opts = {
    ...base,
    mode: effectiveMode,
    palette: block.palette ?? base.palette,
    theme: block.theme ?? base.theme,
    showSource:
      block.showSource ??
      (block.mode ? showcase : base.showSource),
    showCopy:
      block.showCopy ??
      (block.mode ? showcase : base.showCopy),
    showOpenInEditor:
      block.showOpenInEditor ??
      (block.mode ? showcase : base.showOpenInEditor),
  };

  const trimmed = source.trim();
  const { svg: rawSvg, diagnostics } = await render(trimmed, {
    palette: opts.palette,
    theme: opts.theme === 'transparent' ? 'transparent' : opts.theme,
  });
  const svg = normalizeSvg(rawSvg);

  let editorUrl: string | undefined;
  if (opts.showOpenInEditor) {
    const encoded = encodeDiagramUrl(trimmed, { baseUrl: opts.editorBaseUrl });
    editorUrl = encoded.url ?? opts.editorBaseUrl;
  }

  const html = opts.mode === 'showcase'
    ? renderShowcase(trimmed, svg, editorUrl, opts, block.title)
    : renderSimple(svg, opts, block.title);

  return { html, diagnostics };
}

function renderSimple(
  svg: string,
  opts: { wrapper: 'figure' | 'div'; className: string },
  title?: string
): string {
  const Wrapper = opts.wrapper;
  const captionHtml = title
    ? `<figcaption class="astro-dgmo-caption">${escapeHtml(title)}</figcaption>`
    : '';
  // For non-figure wrappers we still emit a caption div if a title was given.
  const captionFallback = title && Wrapper !== 'figure'
    ? `<div class="astro-dgmo-caption">${escapeHtml(title)}</div>`
    : '';
  return (
    `<${Wrapper} class="${escapeAttr(opts.className)} astro-dgmo--diagram">` +
    (Wrapper === 'figure' ? captionHtml : captionFallback) +
    `<div class="astro-dgmo-svg">${svg}</div>` +
    `</${Wrapper}>`
  );
}

function renderShowcase(
  source: string,
  svg: string,
  editorUrl: string | undefined,
  opts: {
    wrapper: 'figure' | 'div';
    className: string;
    showSource: boolean;
    showCopy: boolean;
    showOpenInEditor: boolean;
  },
  title?: string
): string {
  const Wrapper = opts.wrapper;
  const captionHtml = title
    ? Wrapper === 'figure'
      ? `<figcaption class="astro-dgmo-caption">${escapeHtml(title)}</figcaption>`
      : `<div class="astro-dgmo-caption">${escapeHtml(title)}</div>`
    : '';

  const sourceHtml = opts.showSource ? renderSource(source) : '';

  const toolbarParts: string[] = [];
  toolbarParts.push(
    `<span class="astro-dgmo-toolbar-label">dgmo</span>`
  );
  if (opts.showOpenInEditor && editorUrl) {
    toolbarParts.push(
      `<a href="${escapeAttr(editorUrl)}" target="_blank" rel="noopener noreferrer" class="astro-dgmo-open-link">Open in online editor →</a>`
    );
  }
  const toolbar = opts.showSource
    ? `<div class="astro-dgmo-toolbar">${toolbarParts.join('')}</div>`
    : '';

  const copyButton = opts.showCopy && opts.showSource
    ? `<button type="button" class="astro-dgmo-copy" aria-label="Copy to clipboard" data-astro-dgmo-source="${escapeAttr(source)}">
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/>
           <path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/>
         </svg>
       </button>`
    : '';

  return (
    `<${Wrapper} class="${escapeAttr(opts.className)} astro-dgmo--showcase">` +
    captionHtml +
    `<div class="astro-dgmo-card">` +
    (opts.showSource
      ? `<div class="astro-dgmo-source-wrap">${toolbar}<div class="astro-dgmo-source-inner">${sourceHtml}${copyButton}</div></div>`
      : '') +
    `<div class="astro-dgmo-svg">${svg}</div>` +
    `</div>` +
    `</${Wrapper}>`
  );
}

function renderSource(source: string): string {
  const tokens = highlightDgmo(source);
  const inner = tokens
    .map(t => {
      const styles = NORD_ROLE_STYLES[t.role];
      const text = escapeHtml(t.text);
      if (!styles || Object.keys(styles).length === 0) return text;
      const styleStr = Object.entries(styles)
        .map(
          ([k, v]) =>
            `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`
        )
        .join(';');
      return `<span style="${escapeAttr(styleStr)}">${text}</span>`;
    })
    .join('');
  return `<pre class="astro-dgmo-pre"><code class="astro-dgmo-code">${inner}</code></pre>`;
}
