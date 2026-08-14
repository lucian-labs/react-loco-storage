import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Demo-only vite config. Kept separate from any library build config so the
// published artifact is unaffected by how the demo page is bundled.
export default defineConfig({
  root: 'demo',
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      // Import the library by its published name; resolve to working-tree src.
      '@dank-inc/react-loco-storage': resolve(__dirname, 'src/lib'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
})
