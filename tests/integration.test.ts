import { describe, it, expect, vi } from 'vitest';
import dgmoIntegration from '../src/index.js';

describe('astro-dgmo integration shim', () => {
  it('returns an Astro integration with name "astro-dgmo"', () => {
    const integration = dgmoIntegration();
    expect(integration.name).toBe('astro-dgmo');
    expect(integration.hooks).toBeDefined();
    expect(integration.hooks['astro:config:setup']).toBeInstanceOf(Function);
  });

  it('registers remark-dgmo via updateConfig and injects the client script', async () => {
    const integration = dgmoIntegration({ mode: 'showcase' });
    const updateConfig = vi.fn();
    const injectScript = vi.fn();
    await integration.hooks['astro:config:setup']!({
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

  it('preserves user-supplied legacyClassNames in addition to the astro-dgmo aliases', async () => {
    const integration = dgmoIntegration({
      legacyClassNames: ['custom-alias'],
    });
    const updateConfig = vi.fn();
    const injectScript = vi.fn();
    await integration.hooks['astro:config:setup']!({
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

// 🔴 Astro 7 does not run remark plugins, and does it quietly — a green build
// with every diagram missing. These cover the three answers the hook can get
// when it asks what Markdown processor it has, because the difference between
// them is the difference between a page of diagrams and a page of nothing.
//
// `@astrojs/markdown-remark` is stubbed rather than installed-and-imported: the
// real module is an optional peer, so a test importing it directly would pass
// or fail on whether someone happened to install it.
describe('the Markdown processor Astro 7 hands us', () => {
  const setup = async (
    config: unknown,
    markdownRemark?: Record<string, unknown>
  ) => {
    vi.resetModules();
    if (markdownRemark) {
      vi.doMock('@astrojs/markdown-remark', () => markdownRemark);
    } else {
      vi.doMock('@astrojs/markdown-remark', () => {
        throw new Error('not installed');
      });
    }
    const { default: integration } = await import('../src/index.js');
    const updateConfig = vi.fn();
    const injectScript = vi.fn();
    const warn = vi.fn();
    await integration().hooks['astro:config:setup']!({
      config,
      updateConfig,
      injectScript,
      logger: { warn },
    } as never);
    return { updateConfig, warn };
  };

  const unifiedProcessor = (plugins: unknown[] = []) => ({
    name: 'unified',
    options: { remarkPlugins: plugins, rehypePlugins: [], remarkRehype: {} },
  });

  it('on Astro 4-6 there is no processor, so it registers a remark plugin as before', async () => {
    const { updateConfig, warn } = await setup({ markdown: {} });
    expect(updateConfig).toHaveBeenCalledOnce();
    expect(updateConfig.mock.calls[0][0].markdown.remarkPlugins).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('joins a unified processor the site already chose, rather than replacing it', async () => {
    // Replacing would silently delete every other plugin the site configured,
    // which is the same class of quiet breakage this whole change exists for.
    const theirPlugin = () => {};
    const processor = unifiedProcessor([theirPlugin]);
    const { updateConfig, warn } = await setup(
      { markdown: { processor } },
      { unified: () => unifiedProcessor(), isUnifiedProcessor: () => true }
    );
    expect(processor.options.remarkPlugins).toHaveLength(2);
    expect(processor.options.remarkPlugins[0]).toBe(theirPlugin);
    expect(updateConfig).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('takes over a processor that cannot run us, and says so out loud', async () => {
    const built = unifiedProcessor();
    const { updateConfig, warn } = await setup(
      { markdown: { processor: { name: 'satteri' } } },
      {
        unified: (opts: { remarkPlugins: unknown[] }) => {
          built.options.remarkPlugins = opts.remarkPlugins;
          return built;
        },
        isUnifiedProcessor: () => false,
      }
    );
    expect(updateConfig).toHaveBeenCalledOnce();
    expect(updateConfig.mock.calls[0][0].markdown.processor).toBe(built);
    expect(built.options.remarkPlugins).toHaveLength(1);
    // The warning must name the processor it displaced — "something was
    // replaced" is not actionable, "satteri was replaced" is.
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('satteri');
  });
});
