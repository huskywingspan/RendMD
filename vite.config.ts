/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // TipTap + ProseMirror ecosystem — the largest vendor dependency
            if (id.includes('@tiptap') || id.includes('tiptap-markdown') || id.includes('prosemirror') || id.includes('orderedmap') || id.includes('w3c-keyname') || id.includes('rope-sequence') || id.includes('crelt')) {
              return 'vendor-tiptap';
            }
          }
        },
      },
    },
  },
})
