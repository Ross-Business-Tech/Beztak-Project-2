// Builds the self-hosted server into dist-server/ (one file, no extra packages to install).
//   npm run build:server
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'server/index.js',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: { output: { entryFileNames: 'index.js', format: 'esm' } },
  },
  ssr: { noExternal: true },
})
