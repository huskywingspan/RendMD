/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
