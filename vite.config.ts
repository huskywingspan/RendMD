/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],

      manifest: {
        name: 'RendMD',
        short_name: 'RendMD',
        description:
          'A rendered-first markdown editor. Open a folder, read and edit your .md files, save straight back to disk.',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#16171c',
        theme_color: '#16171c',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        // Registers RendMD with the OS as a handler for markdown, so a
        // double-clicked .md opens here. Files arrive through launchQueue;
        // see useLaunchQueue.ts.
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
              'text/plain': ['.md', '.markdown'],
            },
          },
        ],

        launch_handler: {
          client_mode: ['navigate-existing', 'auto'],
        },

        // "New document" from the taskbar/dock context menu.
        shortcuts: [
          {
            name: 'New document',
            short_name: 'New',
            url: '/?new=1',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },

      workbox: {
        // Precache the shell — app code, styles, fonts, icons — so RendMD
        // opens instantly and works with no network.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // ...but not the syntax grammars. Precaching all thirty put 3.8 MB on
        // disk at install for languages a given user will mostly never open.
        // They are cached on first use instead (see runtimeCaching below),
        // which takes the install down to about 1 MB.
        globIgnores: ['**/langs/**'],
        maximumFileSizeToCacheInBytes: 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',

        runtimeCaching: [
          {
            urlPattern: /\/assets\/langs\/.*\.js$/,
            // Grammars are content-hashed and immutable, so once one is
            // cached it never needs revalidating.
            handler: 'CacheFirst',
            options: {
              cacheName: 'rendmd-syntax-grammars',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        // Keeps the dev server free of a service worker intercepting HMR.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  build: {
    // Raised deliberately: vendor-tiptap is one intentional always-needed chunk.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Syntax grammars go in their own directory so the service worker can
        // tell them apart from app code by path and cache them lazily.
        chunkFileNames(chunkInfo) {
          const fromShikiLangs = chunkInfo.moduleIds?.some((id) =>
            id.includes('@shikijs/langs'),
          );
          return fromShikiLangs ? 'assets/langs/[name]-[hash].js' : 'assets/[name]-[hash].js';
        },
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // TipTap + ProseMirror ecosystem — the largest vendor dependency and
          // always needed, so it gets its own long-lived cacheable chunk.
          if (
            id.includes('@tiptap') ||
            id.includes('tiptap-markdown') ||
            id.includes('prosemirror') ||
            id.includes('orderedmap') ||
            id.includes('w3c-keyname') ||
            id.includes('rope-sequence') ||
            id.includes('crelt')
          ) {
            return 'vendor-tiptap';
          }
          return undefined;
        },
      },
    },
  },
});
