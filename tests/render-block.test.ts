import { describe, it, expect } from 'vitest';
import { renderDgmoBlock } from '../src/render-block.js';

const SAMPLE = `chart: sequence
A -> B
B -> C`;

describe('renderDgmoBlock', () => {
  it('renders simple diagram mode by default', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, null);
    expect(html).toContain('astro-dgmo--diagram');
    expect(html).toContain('<svg');
    expect(html).not.toContain('astro-dgmo-pre');
    expect(html).not.toContain('astro-dgmo-copy');
    expect(html).not.toContain('astro-dgmo-open');
  });

  it('renders showcase mode with source + copy + editor link', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, 'showcase');
    expect(html).toContain('astro-dgmo--showcase');
    expect(html).toContain('astro-dgmo-pre');
    expect(html).toContain('astro-dgmo-copy');
    expect(html).toContain('astro-dgmo-open');
    expect(html).toContain('online.diagrammo.app');
  });

  it('respects integration default mode = showcase', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, null, { mode: 'showcase' });
    expect(html).toContain('astro-dgmo--showcase');
  });

  it('per-block diagram override beats integration showcase default', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, 'diagram', {
      mode: 'showcase',
    });
    expect(html).toContain('astro-dgmo--diagram');
    expect(html).not.toContain('astro-dgmo--showcase');
  });

  it('per-block title renders as caption', async () => {
    const { html } = await renderDgmoBlock(
      SAMPLE,
      'showcase title="Login flow"'
    );
    expect(html).toContain('<figcaption');
    expect(html).toContain('Login flow');
  });

  it('per-block palette override changes resulting svg', async () => {
    const a = await renderDgmoBlock(SAMPLE, 'palette=nord');
    const b = await renderDgmoBlock(SAMPLE, 'palette=dracula');
    expect(a.html).not.toEqual(b.html);
  });

  it('escapes title HTML', async () => {
    const { html } = await renderDgmoBlock(
      SAMPLE,
      'showcase title="<script>x</script>"'
    );
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('honors noOpenInEditor', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, 'showcase noOpenInEditor');
    expect(html).not.toContain('astro-dgmo-open');
  });

  it('honors noSource (showcase without source listing)', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, 'showcase noSource');
    expect(html).toContain('astro-dgmo--showcase');
    expect(html).not.toContain('astro-dgmo-pre');
    // Toolbar (which contains the open + copy buttons) is suppressed when
    // source is hidden, since the toolbar is part of the source-wrap surface.
    expect(html).not.toContain('astro-dgmo-toolbar');
  });

  it('uses custom editorBaseUrl', async () => {
    const { html } = await renderDgmoBlock(SAMPLE, 'showcase', {
      editorBaseUrl: 'https://example.test/editor',
    });
    expect(html).toContain('https://example.test/editor');
  });

  it('returns parser diagnostics for unparsable input', async () => {
    const { html } = await renderDgmoBlock(
      'totally not a diagram',
      null
    );
    // Should still produce wrapper HTML; renderer returns empty SVG + diagnostics.
    expect(html).toContain('astro-dgmo--diagram');
  });
});
