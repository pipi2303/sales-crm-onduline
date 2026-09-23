import * as Sentry from '@sentry/react';

// Bab 16.5 -- Fase 2 Hardening (23 Sep 2026): error monitoring, dibangun
// di atas ErrorBoundary (src/app/components/ErrorBoundary.tsx) yang
// sudah ada tempat untuk melaporkan error ke sini.
//
// SENGAJA no-op kalau VITE_SENTRY_DSN tidak di-set (default -- belum ada
// akun Sentry yang dibuat untuk project ini). Tidak menambah dependency
// runtime/network apa pun sampai DSN benar-benar diisi, jadi aman
// di-commit dan di-deploy sekarang tanpa perlu akun Sentry lebih dulu.
//
// Env var pakai prefix VITE_ (bukan cuma SENTRY_DSN) karena ini dibaca
// di kode frontend (src/) yang jalan di browser -- Vite cuma expose env
// var berprefix VITE_ ke bundle client, lihat:
// https://vite.dev/guide/env-and-mode
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const sentryEnabled = Boolean(dsn);

export function initSentry(): void {
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Trace sample rate rendah -- ini app CRM internal, bukan produk
    // volume tinggi, jadi tidak butuh sampling agresif untuk dapat sinyal
    // yang berguna. Naikkan kalau volume trafik/error report berbeda.
    tracesSampleRate: 0.1,
  });
}

// Dipanggil dari ErrorBoundary.componentDidCatch -- no-op yang aman kalau
// Sentry belum diaktifkan (dsn kosong), supaya ErrorBoundary tidak perlu
// tahu/peduli apakah Sentry aktif atau tidak.
export function reportError(error: Error, extra?: Record<string, unknown>): void {
  if (!sentryEnabled) {
    return;
  }
  Sentry.captureException(error, extra ? { extra } : undefined);
}
