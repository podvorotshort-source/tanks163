import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Режим разработки: инструмент ?dev=tune записывает масштабы графики в assets/sprites/scales.json. */
const saveScales: Plugin = {
  name: 'tk-save-scales',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__tk/scales', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          JSON.parse(body);
          writeFileSync(fileURLToPath(new URL('./assets/sprites/scales.json', import.meta.url)), body);
          res.end('ok');
        } catch (e) {
          res.statusCode = 400;
          res.end(String(e));
        }
      });
    });
  },
};

export default defineConfig(({ command }) => ({
  base: './',
  // Явный IPv4: иначе localhost слушается только на [::1], и часть браузеров получает отказ в соединении.
  server: { host: '127.0.0.1' },
  plugins: command === 'build' ? [viteSingleFile()] : [saveScales],
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60_000,
  },
}));
