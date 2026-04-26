import { visit } from 'unist-util-visit';
import type { Root, Code, Html, Parent } from 'mdast';
import { renderDgmoBlock } from './render-block.js';
import type { DgmoIntegrationOptions } from './options.js';

export type RemarkDgmoOptions = DgmoIntegrationOptions;

interface FencePayload {
  source: string;
  meta: string | null;
}

interface Target {
  parent: Parent;
  index: number;
  payload: FencePayload;
}

/**
 * Remark plugin that finds ```dgmo fenced code blocks and replaces them with
 * an HTML node containing the rendered SVG (and optional showcase chrome).
 *
 * The `lang` field on the code node is the fence language (the word after the
 * backticks). The `meta` field is everything that follows on the same line,
 * which we use to allow per-block options like ```dgmo showcase palette=catppuccin.
 *
 * Replaces the code node entirely (parent.children[index] = newNode) rather
 * than mutating it in place — otherwise downstream rehype/Shiki plugins still
 * see the lingering `lang: 'dgmo'` and `value: '...source...'` properties and
 * may re-process the block as a plaintext code listing, clobbering our
 * syntax-highlighted output.
 *
 * Async-safe: replacement is collected first, applied after parsing finishes.
 */
export default function remarkDgmo(options: RemarkDgmoOptions = {}) {
  return async function transformer(tree: Root): Promise<void> {
    const targets: Target[] = [];
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'dgmo') return;
      if (!parent || index === undefined) return;
      targets.push({
        parent: parent as Parent,
        index,
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

    // Replace in reverse index order per parent so earlier replacements don't
    // shift indices of later targets in the same parent. (Visit walks in tree
    // order, so within a single parent's children targets are also ordered;
    // reversing is sufficient.)
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const html: Html = { type: 'html', value: rendered[i].html };
      t.parent.children[t.index] = html;
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
