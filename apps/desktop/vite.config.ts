import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main/index.ts'),
        preload: path.resolve(__dirname, 'src/preload/index.ts'),
        renderer: path.resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        entryFileNames: '[name]/index.js',
      },
    },
  },
});
