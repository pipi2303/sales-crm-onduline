import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportError } from '@/utils/sentry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  // Label opsional supaya boundary bersarang (misal yang bungkus satu menu
  // saja) bisa kasih pesan lebih spesifik daripada boundary tingkat app.
  fallbackLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Bab 16.5 -- Fase 2 Hardening (23 Sep 2026): sebelumnya error render di
// komponen mana pun (state korup, response API tak terduga, bug UI, dst)
// bikin SELURUH app blank putih untuk user yang sedang pakai -- satu-satunya
// cara recover adalah reload manual tanpa tahu apa yang salah. ErrorBoundary
// ini menangkap error render di subtree-nya, menampilkan fallback UI yang
// jelas + tombol retry, dan mencatat detail errornya ke console (siap
// disambungkan ke error monitoring/Sentry kalau itu dikerjakan nanti).
//
// Dipakai dua tingkat di App.tsx: satu di level app (kalau AuthProvider/
// AppContent sendiri yang crash), satu lagi di sekeliling <ActiveComponent />
// dengan key={activeMenu} -- supaya kalau satu menu (mis. SalesReports)
// crash, sidebar & menu lain tetap utuh dan user tinggal pindah menu untuk
// "reset" boundary itu, tidak perlu reload seluruh app.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
    // No-op kalau Sentry belum diaktifkan (VITE_SENTRY_DSN belum di-set)
    // -- lihat src/utils/sentry.ts.
    reportError(error, { componentStack: errorInfo.componentStack, fallbackLabel: this.props.fallbackLabel });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full text-center bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {this.props.fallbackLabel || 'Terjadi kesalahan'}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Ada masalah saat menampilkan bagian ini. Coba lagi, atau muat ulang halaman kalau masalah berlanjut.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-400 mb-6 break-words font-mono bg-gray-50 rounded p-2">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#013E37] text-white text-sm font-medium hover:opacity-90 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
