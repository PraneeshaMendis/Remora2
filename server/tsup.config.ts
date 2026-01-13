import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  treeshake: false,
  minify: false,
  skipNodeModulesBundle: true,
  dts: false,
})

