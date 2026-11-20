import {Bell, CheckCheck, Receipt, CalendarCheck, MapPin, X, Volume2, VolumeX} from 'lucide-react';
import React, {useState} from 'react';
import type {NotificationItem} from '../types.ts';
import {formatRupiah, formatTimeShort} from '../utils/format.ts';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  soundEnabled,
  onToggleSound,
  onMarkAllRead,
  onMarkRead,
}) => {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => n.is_read === 0).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'transaction':
        return <Receipt className="h-4 w-4 text-[#09090B] dark:text-[#DCA842]" />;
      case 'booking':
        return <CalendarCheck className="h-4 w-4 text-[#C5922E]" />;
      case 'attendance':
        return <MapPin className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />;
      default:
        return <Bell className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#09090B] hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        aria-label="Notifikasi otomatis transaksi"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C5922E] px-1 font-mono text-[10px] font-bold text-white tabular-nums">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
              <div>
                <h3 className="font-display text-sm font-bold text-[#09090B] dark:text-white">Notifikasi Realtime</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Pembaruan otomatis transaksi kasir &amp; operasional</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-[#09090B] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                  title={soundEnabled ? 'Matikan suara notifikasi' : 'Aktifkan suara notifikasi'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#09090B] hover:bg-zinc-100 dark:text-[#DCA842] dark:hover:bg-zinc-800"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Tandai Baca</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">Belum ada notifikasi terbaru.</div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onMarkRead(item.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/70 ${
                      item.is_read === 0 ? 'bg-zinc-50/90 dark:bg-zinc-800/40' : 'bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
                        {getIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-[#09090B] dark:text-zinc-100">{item.title}</p>
                          <span className="shrink-0 font-mono text-[11px] text-zinc-400 tabular-nums">
                            {formatTimeShort(item.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{item.message}</p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="truncate">{item.branch_name}</span>
                          {item.amount !== null && (
                            <span className="font-mono font-semibold text-[#09090B] dark:text-[#DCA842] tabular-nums">
                              {formatRupiah(item.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
