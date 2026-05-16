/**
 * Backward-compat re-export. `astro-dgmo/remark` was the v0.2 entry point
 * for users wiring the remark plugin into custom unified pipelines. v0.3
 * forwards to `remark-dgmo`, which is now the single source of truth.
 *
 * New code should `import remarkDgmo from 'remark-dgmo'` directly.
 */
export { default } from 'remark-dgmo';
export * from 'remark-dgmo';
