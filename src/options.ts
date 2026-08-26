/**
 * Backward-compat shim. The real types live in `remark-dgmo`; this module
 * re-exports them under the conventional `DgmoIntegrationOptions` name so
 * existing user code continues to type-check.
 */
export type {
  Mode,
  ReferenceOptions,
  ResolvedOptions,
  Theme,
} from 'remark-dgmo';
export { resolveOptions } from 'remark-dgmo';
import type { DgmoOptions } from 'remark-dgmo';

/**
 * `remark-dgmo`'s options, plus the one setting that is Astro's alone.
 */
export type DgmoIntegrationOptions = DgmoOptions & {
  /**
   * Whether the integration adds `remark-dgmo/client.css` to every page.
   * Default `true`.
   *
   * Under the default `colorMode: 'auto'` each fence renders TWO SVGs, and
   * that stylesheet is what hides the one you are not in. It used to be a
   * manual `import` in a layout, which people reasonably did not know to do,
   * and the result was the same diagram printed twice with a green build and
   * nothing said (issue 507).
   *
   * Set `false` only if you ship your own copy of those rules — e.g. you
   * re-key the dark selector onto a signal neither `data-theme="dark"` nor
   * `html.dark` covers. Leaving it `true` while also importing the stylesheet
   * yourself is harmless: Vite resolves both to one module.
   */
  injectClientCss?: boolean;
};
