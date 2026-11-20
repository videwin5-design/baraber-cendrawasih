import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  LogOut,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

export type ActionModalType = 'danger' | 'warning' | 'success' | 'info' | 'logout';

export interface ActionConfirmConfig {
  isOpen: boolean;
  type?: ActionModalType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

export interface ActionFeedbackConfig {
  isOpen: boolean;
  type?: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

/**
 * Modalbox Konfirmasi Tindakan (Hapus, Edit, Keluar, dsb.)
 */
export const ActionConfirmModal: React.FC<ActionConfirmConfig> = ({
  isOpen,
  type = 'danger',
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'logout':
        return <LogOut className="h-6 w-6 text-amber-400 stroke-[2.2]" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-400 stroke-[2.2]" />;
      case 'info':
        return <HelpCircle className="h-6 w-6 text-blue-400 stroke-[2.2]" />;
      case 'danger':
      default:
        return <Trash2 className="h-6 w-6 text-rose-500 stroke-[2.2]" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'logout':
      case 'warning':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'info':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'danger':
      default:
        return 'bg-rose-500/15 border-rose-500/30 text-rose-500';
    }
  };

  const getConfirmBtnColor = () => {
    switch (type) {
      case 'logout':
        return 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-lg shadow-amber-900/30';
      case 'warning':
        return 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-900/30';
      case 'info':
        return 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-900/30';
      case 'danger':
      default:
        return 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-900/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl space-y-4">
        {/* Tombol Tutup Silang */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 ${getIconBg()}`}>
            {getIcon()}
          </div>
          <div className="space-y-1.5 flex-1 pr-4">
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn-tactile rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`btn-tactile inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50 ${getConfirmBtnColor()}`}
          >
            {loading && <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />}
            <span>{loading ? 'Memproses...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Modalbox Feedback Hasil Aksi (Sukses, Error, Info)
 */
export const ActionFeedbackModal: React.FC<ActionFeedbackConfig> = ({
  isOpen,
  type = 'success',
  title,
  message,
  buttonLabel = 'Tutup',
  onClose,
  autoCloseMs,
}) => {
  useEffect(() => {
    if (isOpen && autoCloseMs && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="h-7 w-7 text-rose-500 stroke-[2.2]" />;
      case 'warning':
        return <AlertTriangle className="h-7 w-7 text-amber-400 stroke-[2.2]" />;
      case 'info':
        return <Info className="h-7 w-7 text-blue-400 stroke-[2.2]" />;
      case 'success':
      default:
        return <CheckCircle2 className="h-7 w-7 text-emerald-500 stroke-[2.2]" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'error':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
      case 'warning':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'info':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'success':
      default:
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    }
  };

  const getButtonBg = () => {
    switch (type) {
      case 'error':
        return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-500 text-white';
      case 'success':
      default:
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center shadow-2xl space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`mx-auto h-14 w-14 rounded-2xl border flex items-center justify-center ${getIconBg()}`}>
          {getIcon()}
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`btn-tactile w-full rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${getButtonBg()}`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
