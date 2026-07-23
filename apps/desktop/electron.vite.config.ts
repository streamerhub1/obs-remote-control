import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

const commitSha = execSync('git rev-parse HEAD').toString().trim().substring(0, 7);
const buildDate = new Date().toISOString();
const appVersion = process.env.npm_package_version || '1.0.0';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    define: {
      __COMMIT_SHA__: JSON.stringify(commitSha),
      __BUILD_DATE__: JSON.stringify(buildDate),
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
  },
});
