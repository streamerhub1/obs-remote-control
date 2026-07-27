import { resolve } from 'path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

const commitSha = execSync('git rev-parse HEAD')
  .toString()
  .trim()
  .substring(0, 7);
const buildDate = new Date().toISOString();
const appVersion = process.env.npm_package_version || '1.0.0';

export default defineConfig({
  main: {
    define: {
      'process.env.WS_NO_BUFFER_UTIL': JSON.stringify('1'),
      'process.env.WS_NO_UTF_8_VALIDATE': JSON.stringify('1'),
    },
    build: {
      outDir: 'dist/main',
      externalizeDeps: {
        exclude: [
          '@obs-remote/obs-adapter',
          '@obs-remote/obs-contracts',
          '@obs-remote/remote-protocol',
          'electron-updater',
          'jose',
          'lru-cache',
          'zod',
          'ws',
        ],
      },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      externalizeDeps: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
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
