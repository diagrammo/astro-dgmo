import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    remark: 'src/remark.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  external: ['@diagrammo/dgmo', 'astro', 'remark-dgmo'],
});
