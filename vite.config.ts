/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://domalouf.com/blackjack/ in production; root in dev.
// Override with BASE_PATH when hosting elsewhere.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.BASE_PATH ?? '/blackjack/' : '/',
  plugins: [react()],
  build: {
    // Never inline SVGs as data: URIs — the production CSP (default-src
    // 'self') blocks them. Other small assets inline as usual.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
