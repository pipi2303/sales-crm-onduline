import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Komponen bantu yang bisa dikontrol dari luar test kapan dia throw --
// dipakai untuk memverifikasi ErrorBoundary menangkap error render dan
// menampilkan fallback, lalu bisa "Coba Lagi" begitu subtree-nya sudah
// tidak throw lagi.
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Ledakan sengaja untuk test');
  }
  return <div>Konten normal</div>;
}

describe('ErrorBoundary', () => {
  // React log error render ke console.error dua kali secara default --
  // ini expected noise dari test yang sengaja bikin komponen throw, bukan
  // sinyal ada yang salah, jadi di-suppress supaya output test bersih.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('merender children apa adanya kalau tidak ada error', () => {
    render(
      <ErrorBoundary>
        <div>Konten normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Konten normal')).toBeInTheDocument();
  });

  it('menangkap error render dan menampilkan fallback UI, bukan crash ke luar', () => {
    render(
      <ErrorBoundary fallbackLabel="Halaman gagal ditampilkan">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Halaman gagal ditampilkan')).toBeInTheDocument();
    expect(screen.getByText('Ledakan sengaja untuk test')).toBeInTheDocument();
    expect(screen.queryByText('Konten normal')).not.toBeInTheDocument();
  });

  it('pakai pesan default kalau fallbackLabel tidak diisi', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Terjadi kesalahan')).toBeInTheDocument();
  });

  it('tombol "Coba Lagi" me-reset state error boundary', () => {
    let shouldThrow = true;

    function ControllableBomb() {
      return <Bomb shouldThrow={shouldThrow} />;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ControllableBomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Terjadi kesalahan')).toBeInTheDocument();

    // Perbaiki kondisi yang bikin throw, lalu klik "Coba Lagi" -- ini
    // mensimulasikan skenario nyata: user pindah menu (key berubah, lihat
    // App.tsx) atau state penyebab error sudah tidak ada lagi.
    shouldThrow = false;
    fireEvent.click(screen.getByText('Coba Lagi'));
    rerender(
      <ErrorBoundary>
        <ControllableBomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Konten normal')).toBeInTheDocument();
  });
});
