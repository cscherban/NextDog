import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'node:path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      'styled-system': path.resolve(__dirname, 'styled-system'),
    },
  },
  build: {
    outDir: 'dist',
    emptyDir: true,
  },
});
