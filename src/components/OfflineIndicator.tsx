import {WifiOff} from 'lucide-react';
import React from 'react';
import {useOnlineStatus} from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-lg">
      <WifiOff className="h-4 w-4 text-amber-700 dark:text-amber-400" />
      <span>Mode Offline — Menampilkan data tersimpan lokal</span>
    </div>
  );
};
