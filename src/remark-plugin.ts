import { visit } from 'unist-util-visit';
import type { Root, Code, Html } from 'mdast';
import { renderDgmoBlock } from './render-block.js';
import type { DgmoIntegrationOptions } from './options.js';

export type RemarkDgmoOptions = DgmoIntegrationOptions;

interface FencePayload {
  source: string;
  meta: string | null;
}

/**
 * Remark plugin that finds ```dgmo fenced code blocks and replaces them with
 * an HTML node containing the rendered SVG (and optional showcase chrome).
 *
 * The `lang` field on the code node is the fence language (the word after the
 * backticks). The `meta` field is everything that follows on the same line,
 * which we use to allow per-block options like ```dgmo showcase palette=catppuccin.
 *
 * Async-safe: replacement is collected first, applied after parsing finishes.
 */
export default function remarkDgmo(options: RemarkDgmoOptions = {}) {
  return async function transformer(tree: Root): Promise<void> {
    const targets: Array<{ node: Code; payload: FencePayload }> = [];
    visit(tree, 'code', (node: Code) => {
      if (node.lang !== 'dgmo') return;
      targets.push({
        node,
        payload: { source: node.value, meta: node.meta ?? null },
      });
    });
    if (targets.length === 0) return;

    const rendered = await Promise.all(
      targets.map(t =>
        renderDgmoBlock(t.payload.source, t.payload.meta, options).catch(
          err => ({
            html: errorHtml(err, t.payload.source),
            diagnostics: [],
          })
        )
      )
    );

    for (let i = 0; i < targets.length; i++) {
      const out: Html = {
        type: 'html',
        value: rendered[i].html,
      };
      Object.assign(targets[i].node, out);
    }
  };
}

function errorHtml(err: unknown, source: string): string {
  const msg =
    err instanceof Error ? err.message : 'Failed to render dgmo block.';
  const safeMsg = msg.replace(/[<>&]/g, ch =>
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&amp;'
  );
  const safeSrc = source.replace(/[<>&]/g, ch =>
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&amp;'
  );
  return (
    `<div class="astro-dgmo astro-dgmo--error" role="alert">` +
    `<strong>dgmo render error:</strong> ${safeMsg}` +
    `<pre>${safeSrc}</pre></div>`
  );
}
