import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Emits sw-precache.json listing every built file, so the service worker can
 * cache the whole app shell (including lazy-loaded pages) for offline use.
 */
function serviceWorkerPrecache(): Plugin {
  return {
    name: 'nexium-sw-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((file) => !file.endsWith('.map') && file !== 'index.html')
        .map((file) => `/${file}`);
      this.emitFile({
        type: 'asset',
        fileName: 'sw-precache.json',
        source: JSON.stringify({ buildId, assets }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerPrecache()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    port: 5173,
  },
});
