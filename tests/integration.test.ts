import { describe, it, expect, vi } from 'vitest';
import dgmoIntegration from '../src/index.js';

describe('astro-dgmo integration shim', () => {
  it('returns an Astro integration with name "astro-dgmo"', () => {
    const integration = dgmoIntegration();
    expect(integration.name).toBe('astro-dgmo');
    expect(integration.hooks).toBeDefined();
    expect(integration.hooks['astro:config:setup']).toBeInstanceOf(Function);
  });

  it('registers remark-dgmo via updateConfig and injects the client script', () => {
    const integration = dgmoIntegration({ mode: 'showcase' });
    const updateConfig = vi.fn();
    const injectScript = vi.fn();
    integration.hooks['astro:config:setup']!({
      updateConfig,
      injectScript,
    } as never);

    expect(updateConfig).toHaveBeenCalledOnce();
    const arg = updateConfig.mock.calls[0][0];
    expect(arg.markdown.remarkPlugins).toHaveLength(1);
    const [plugin, opts] = arg.markdown.remarkPlugins[0];
    expect(typeof plugin).toBe('function');
    // user-supplied options pass through…
    expect(opts.mode).toBe('showcase');
    // …and the legacy class-name shim is appended automatically
    expect(opts.legacyClassNames).toEqual(
      expect.arrayContaining(['astro-dgmo', 'astro-dgmo-card'])
    );

    expect(injectScript).toHaveBeenCalledOnce();
    const [stage, code] = injectScript.mock.calls[0];
    expect(stage).toBe('page');
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  it('preserves user-supplied legacyClassNames in addition to the astro-dgmo aliases', () => {
    const integration = dgmoIntegration({
      legacyClassNames: ['custom-alias'],
    });
    const updateConfig = vi.fn();
    const injectScript = vi.fn();
    integration.hooks['astro:config:setup']!({
      updateConfig,
      injectScript,
    } as never);
    const [, opts] = updateConfig.mock.calls[0][0].markdown.remarkPlugins[0];
    expect(opts.legacyClassNames).toEqual([
      'custom-alias',
      'astro-dgmo',
      'astro-dgmo-card',
    ]);
  });
});
