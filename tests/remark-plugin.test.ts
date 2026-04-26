import { describe, it, expect } from 'vitest';
import remarkDgmo from '../src/remark-plugin.js';
import type { Root } from 'mdast';

function buildTree(blocks: Array<{ lang: string; meta?: string | null; value: string }>): Root {
  return {
    type: 'root',
    children: blocks.map(b => ({
      type: 'code',
      lang: b.lang,
      meta: b.meta ?? null,
      value: b.value,
    })),
  };
}

describe('remarkDgmo plugin', () => {
  it('replaces ```dgmo blocks with html nodes', async () => {
    const transform = remarkDgmo();
    const tree = buildTree([
      { lang: 'dgmo', value: 'chart: sequence\nA -> B' },
    ]);
    await transform(tree);
    const node = tree.children[0] as { type: string; value: string };
    expect(node.type).toBe('html');
    expect(node.value).toContain('astro-dgmo--diagram');
  });

  it('leaves non-dgmo blocks alone', async () => {
    const transform = remarkDgmo();
    const tree = buildTree([
      { lang: 'js', value: 'const x = 1' },
      { lang: 'dgmo', value: 'chart: sequence\nA -> B' },
      { lang: 'python', value: 'print(1)' },
    ]);
    await transform(tree);
    expect(tree.children[0].type).toBe('code');
    expect(tree.children[1].type).toBe('html');
    expect(tree.children[2].type).toBe('code');
  });

  it('passes meta to the renderer', async () => {
    const transform = remarkDgmo();
    const tree = buildTree([
      { lang: 'dgmo', meta: 'showcase', value: 'chart: sequence\nA -> B' },
    ]);
    await transform(tree);
    const node = tree.children[0] as { value: string };
    expect(node.value).toContain('astro-dgmo--showcase');
  });

  it('honors integration-level options', async () => {
    const transform = remarkDgmo({ mode: 'showcase' });
    const tree = buildTree([
      { lang: 'dgmo', value: 'chart: sequence\nA -> B' },
    ]);
    await transform(tree);
    const node = tree.children[0] as { value: string };
    expect(node.value).toContain('astro-dgmo--showcase');
  });
});
