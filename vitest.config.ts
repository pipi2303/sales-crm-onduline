import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

// Bab 16.5 Fase 2 Hardening (23 Sep 2026): test suite pertama untuk
// project ini (belum ada dependency testing sama sekali sebelumnya).
// Sengaja mulai dari beberapa smoke test kritis -- terutama untuk
// perilaku yang barusan ditambahkan di Tier 1 (ErrorBoundary, guard
// JSON.parse) -- bukan coverage penuh dari nol, supaya langsung ada
// jaring pengaman terhadap regresi paling berbahaya tanpa menghabiskan
// waktu besar sebelum ada kebutuhan nyata untuk lebih.
//
// File config terpisah dari vite.config.ts (bukan `test: {...}` di
// dalamnya) supaya IDE TypeScript tidak bingung dengan tipe `test` dari
// Vitest vs properti lain -- pola standar yang direkomendasikan Vitest
// sendiri untuk project yang sudah punya vite.config.ts.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
