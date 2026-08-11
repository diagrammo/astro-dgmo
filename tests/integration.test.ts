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

  // 🔴 The takeover must carry what earlier integrations already registered.
  // Starlight pushes its aside/directive remark plugins into
  // `config.markdown.remarkPlugins`, where Sätteri never looks — and the first
  // version of this takeover rebuilt the pipeline as `[ourPlugin]` alone, so
  // every `:::note` on a Starlight site rendered as literal `:::` text while
  // the diagrams worked (issue 191). Theirs first, ours appended; rehype and
  // the site's own Markdown semantics ride along.
  it('carries previously registered plugins and settings into the takeover', async () => {
    const theirRemark = () => {};
    const theirRehype = () => {};
    const captured: Record<string, unknown> = {};
    const built = unifiedProcessor();
    const { updateConfig, warn } = await setup(
      {
        markdown: {
          processor: { name: 'satteri' },
          remarkPlugins: [theirRemark],
          rehypePlugins: [theirRehype],
          gfm: false,
          smartypants: false,
        },
      },
      {
        unified: (opts: Record<string, unknown>) => {
          Object.assign(captured, opts);
          return built;
        },
        isUnifiedProcessor: () => false,
      }
    );
    expect(updateConfig).toHaveBeenCalledOnce();
    expect(captured['remarkPlugins']).toHaveLength(2);
    expect((captured['remarkPlugins'] as unknown[])[0]).toBe(theirRemark);
    expect(captured['rehypePlugins']).toEqual([theirRehype]);
    expect(captured['gfm']).toBe(false);
    expect(captured['smartypants']).toBe(false);
    // And the warning counts what it carried, so a site owner reading it can
    // tell a full pipeline from an empty one.
    expect(warn.mock.calls[0][0]).toContain('1 remark');
    expect(warn.mock.calls[0][0]).toContain('1 rehype');
  });

  // 🔴 The trap the carry above CANNOT fix: an integration that ran before us
  // and registered into the Sätteri processor's OWN options (Starlight's
  // asides live in `mdastPlugins`). Those are lost with the processor, so the
  // takeover must say so and name the fix — list dgmo() first.
  it('warns when the replaced processor carries plugins we cannot save', async () => {
    const { warn } = await setup(
      {
        markdown: {
          processor: {
            name: 'satteri',
            options: { mdastPlugins: [() => {}, () => {}], hastPlugins: [() => {}] },
          },
        },
      },
      {
        unified: () => unifiedProcessor(),
        isUnifiedProcessor: () => false,
      }
    );
    const stranded = warn.mock.calls.find(
      (c: string[]) => typeof c[0] === 'string' && c[0].includes('CANNOT be carried over')
    );
    expect(stranded).toBeDefined();
    expect(stranded![0]).toContain('3 plugin(s)');
    expect(stranded![0]).toContain('BEFORE');
  });
});
