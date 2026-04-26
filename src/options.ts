export type Mode = 'diagram' | 'showcase';

export type Theme = 'light' | 'dark' | 'transparent';

export interface DgmoIntegrationOptions {
  /**
   * Output mode for `dgmo` fenced blocks.
   * - `diagram` (default): render the SVG only, in a `<figure>`.
   * - `showcase`: render syntax-highlighted source + SVG + copy + open-in-editor.
   *
   * Override per-block via the fence info string: ```dgmo showcase
   */
  mode?: Mode;

  /** Default palette name. Default: `nord`. */
  palette?: string;

  /** Default theme. Default: `dark`. */
  theme?: Theme;

  /**
   * Show source code above the diagram. Defaults to `true` in showcase mode,
   * `false` in diagram mode.
   */
  showSource?: boolean;

  /**
   * Show a copy-to-clipboard button. Defaults to `true` in showcase mode,
   * `false` in diagram mode.
   */
  showCopy?: boolean;

  /**
   * Show an "Open in online editor" link. Defaults to `true` in showcase mode,
   * `false` in diagram mode.
   */
  showOpenInEditor?: boolean;

  /**
   * Base URL for the "Open in editor" link. Default: `https://online.diagrammo.app`.
   * The plugin appends `?dgmo=...` (compressed source) to the base.
   */
  editorBaseUrl?: string;

  /**
   * Wrapper element. Default: `figure`.
   */
  wrapper?: 'figure' | 'div';

  /**
   * Class added to the outer wrapper. Defaults to `astro-dgmo`.
   * Useful as a styling hook.
   */
  className?: string;
}

export type ResolvedOptions = Required<
  Omit<DgmoIntegrationOptions, 'showSource' | 'showCopy' | 'showOpenInEditor'>
> & {
  showSource: boolean;
  showCopy: boolean;
  showOpenInEditor: boolean;
};

/**
 * Apply defaults, including mode-dependent defaults for showSource/showCopy/showOpenInEditor.
 */
export function resolveOptions(
  opts: DgmoIntegrationOptions = {}
): ResolvedOptions {
  const mode: Mode = opts.mode ?? 'diagram';
  const showcase = mode === 'showcase';
  return {
    mode,
    palette: opts.palette ?? 'nord',
    theme: opts.theme ?? 'dark',
    showSource: opts.showSource ?? showcase,
    showCopy: opts.showCopy ?? showcase,
    showOpenInEditor: opts.showOpenInEditor ?? showcase,
    editorBaseUrl: opts.editorBaseUrl ?? 'https://online.diagrammo.app',
    wrapper: opts.wrapper ?? 'figure',
    className: opts.className ?? 'astro-dgmo',
  };
}
