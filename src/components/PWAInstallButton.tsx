import {Download, Smartphone, X} from 'lucide-react';
import React, {useState} from 'react';
import {usePWAInstall} from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({variant = 'header'}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === 'header'
            ? 'btn-tactile inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-[#09090B] hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
            : 'btn-tactile inline-flex items-center gap-2 rounded-lg bg-[#09090B] px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="h-3.5 w-3.5" />
        <span>Pasang Aplikasi</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#09090B] text-white">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#09090B] dark:text-white">Pasang Aplikasi PWA</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Akses langsung tanpa Play Store / App Store</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Tutup panduan instalasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              {isIOS ? (
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Ketuk ikon <strong>Bagikan (Share)</strong> pada bilah Safari di bagian bawah layar.
                  </li>
                  <li>
                    Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    Ketuk <strong>Tambah</strong> untuk menjalankan Barbershop Cendrawasih secara mandiri.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Buka menu browser (ikon titik tiga di pojok kanan atas Chrome/Edge).
                  </li>
                  <li>
                    Pilih <strong>Install App</strong> atau <strong>Tambahkan ke Layar Utama</strong>.
                  </li>
                  <li>Aplikasi akan terpasang di perangkat Anda dengan dukungan offline dan notifikasi langsung.</li>
                </ol>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="btn-tactile rounded-lg bg-[#09090B] px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-[#C5922E] dark:text-zinc-950"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
