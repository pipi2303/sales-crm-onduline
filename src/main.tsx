import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/styles/index.css';
import { initSentry } from '@/utils/sentry';

// No-op kalau VITE_SENTRY_DSN belum di-set -- lihat src/utils/sentry.ts.
initSentry();

// Bab 40: tiap deploy baru menghasilkan nama file JS chunk dengan hash
// berbeda (fitur code-splitting Vite). Kalau ada tab yang sudah lama
// terbuka lalu user berpindah ke halaman yang di-lazy-load SETELAH
// deploy baru jalan, browser masih minta chunk lama yang sudah tidak
// ada -> gagal dengan "Failed to fetch dynamically imported module"
// (dilaporkan sebelumnya: SalesTeam-*.js, storesRepository-*.js 404).
// Vite memancarkan event 'vite:preloadError' untuk kasus ini -- reload
// sekali otomatis supaya user langsung dapat build terbaru, dengan
// pengaman sessionStorage supaya tidak reload berulang tanpa henti
// kalau error-nya ternyata bukan soal chunk basi (mis. network benar-benar
// putus atau file memang hilang di server).
const PRELOAD_RELOAD_KEY = 'vite-preload-reload-attempted';

// Setiap kali main.tsx sungguhan jalan dari awal (page load baru,
// termasuk setelah reload otomatis di bawah berhasil), anggap ini
// "sesi bersih" -- hapus flag supaya deploy berikutnya (jam/hari lain,
// tab yang sama) tetap dapat satu kesempatan auto-reload lagi, bukan
// diam-diam berhenti mencoba selamanya.
sessionStorage.removeItem(PRELOAD_RELOAD_KEY);

window.addEventListener('vite:preloadError', (event) => {
  if (sessionStorage.getItem(PRELOAD_RELOAD_KEY)) {
    // Sudah pernah dicoba reload di tab ini dan masih gagal lagi --
    // jangan looping, biarkan error aslinya tampil ke console.
    return;
  }
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, '1');
  event.preventDefault();
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
