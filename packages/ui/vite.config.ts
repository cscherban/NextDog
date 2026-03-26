import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'node:path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'styled-system': path.resolve(__dirname, 'styled-system'),
    },
  },
  build: {
    outDir: 'dist',
    emptyDir: true,
  },
});
