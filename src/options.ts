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
export type { DgmoOptions as DgmoIntegrationOptions } from 'remark-dgmo';
