// utils/toast.tsx
// Sistema de notificações nativo — sem dependências externas
// Uso: import { toast } from "./utils/toast"
//      toast.success("Salvo!") | toast.error("Erro") | toast.warning("Atenção")

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// ─── Tipos ───────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  removing: boolean;
}

interface ToastContextValue {
  add: (type: ToastType, message: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);
let _add: ((type: ToastType, message: string) => void) | null = null;
let _id = 0;

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    // Marca como "removing" para animar saída
    setToasts(p => p.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 350);
  }, []);

  const add = useCallback((type: ToastType, message: string) => {
    const id = ++_id;
    // Descarta qualquer toast anterior do mesmo tipo antes de adicionar
    setToasts(p => {
      const prev = p.find(t => t.type === type && !t.removing);
      if (prev) {
        setTimeout(() => setToasts(q => q.filter(t => t.id !== prev.id)), 0);
      }
      return [...p.filter(t => t.type !== type || t.removing), { id, type, message, removing: false }];
    });
    // Auto-remove após 3.5s
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  // Expõe o add globalmente para uso fora de componentes React
  useEffect(() => { _add = add; return () => { _add = null; }; }, [add]);

  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      {toasts.length > 0 && typeof document !== "undefined" && document.body
        ? createPortal(
            <div className="fh-toast-container" aria-live="polite" aria-atomic="false">
              {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
              ))}
            </div>,
            document.body
          )
        : null
      }
    </ToastContext.Provider>
  );
}

// ─── Toast individual ─────────────────────────────────────────────────────────
function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Anima a barra de progresso
    const bar = barRef.current;
    if (!bar) return;
    bar.style.transition = "none";
    bar.style.width = "100%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = "width 3.5s linear";
        bar.style.width = "0%";
      });
    });
  }, []);

  const icons: Record<ToastType, string> = {
    success: "bx bx-check-circle",
    error:   "bx bx-x-circle",
    warning: "bx bx-error",
  };

  return (
    <div className={`fh-toast fh-toast-${toast.type}${toast.removing ? " fh-toast-out" : " fh-toast-in"}`} role="alert">
      <i className={`${icons[toast.type]} fh-toast-icon`} />
      <span className="fh-toast-msg">{toast.message}</span>
      <button className="fh-toast-close" onClick={onClose} aria-label="Fechar">
        <i className="bx bx-x" />
      </button>
      <div className="fh-toast-bar" ref={barRef} />
    </div>
  );
}

// ─── Hook (uso dentro de componentes) ────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return {
    success: (msg: string) => ctx.add("success", msg),
    error:   (msg: string) => ctx.add("error",   msg),
    warning: (msg: string) => ctx.add("warning",  msg),
  };
}

// ─── API global (uso fora de componentes, ex: notifier.ts) ───────────────────
export const toast = {
  success: (msg: string) => _add?.("success", msg),
  error:   (msg: string) => _add?.("error",   msg),
  warning: (msg: string) => _add?.("warning",  msg),
};