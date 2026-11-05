import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const sdkVersion = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
).version as string;

export default defineConfig({
  plugins: [react()],
  define: {
    __SDK_VERSION__: JSON.stringify(sdkVersion),
  },
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
});
