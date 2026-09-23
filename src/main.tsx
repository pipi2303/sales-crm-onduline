import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/styles/index.css';
import { initSentry } from '@/utils/sentry';

// No-op kalau VITE_SENTRY_DSN belum di-set -- lihat src/utils/sentry.ts.
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
