import React from 'react';
import { CheckCircle2, AlertCircle, Info, Zap, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'launch';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto p-4 rounded-2xl bg-slate-900/95 border border-slate-700/90 shadow-2xl shadow-black/80 flex items-start gap-3 animate-slideUp text-xs"
        >
          {toast.type === 'launch' && (
            <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
          )}
          {toast.type === 'success' && (
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
              <Info className="w-4 h-4" />
            </div>
          )}
          {toast.type === 'warning' && (
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-100">{toast.title}</div>
            {toast.description && (
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{toast.description}</p>
            )}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
