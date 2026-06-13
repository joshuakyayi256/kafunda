"use client";

/**
 * Toast system — lightweight, no external library.
 * ------------------------------------------------
 * Usage anywhere inside <ToastProvider>:
 *
 *   const { toast } = useToast();
 *   toast("Added to cart");                       // success (default)
 *   toast("Could not reach the store", "error");
 *   toast("Order pending confirmation", "info");
 *
 * Renders a stack bottom-centre on mobile, bottom-right on desktop.
 * Auto-dismisses after 2.6s; tap/click to dismiss early.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_TTL_MS = 2600;
const MAX_VISIBLE = 3;

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  success: "bg-kafunda-green-deep text-white",
  error: "bg-kafunda-crimson text-white",
  info: "bg-zinc-900 text-white",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, type }]);
      window.setTimeout(() => dismiss(id), TOAST_TTL_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — above the mobile pill nav (bottom-24), bottom-right on desktop */}
      <div
        aria-live="polite"
        className="fixed z-100 inset-x-0 bottom-24 md:inset-x-auto md:right-6 md:bottom-6 flex flex-col items-center md:items-end gap-2 px-4 md:px-0 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map(({ id, message, type }) => {
            const Icon = ICONS[type];
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => dismiss(id)}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={`pointer-events-auto flex items-center gap-2.5 pl-4 pr-3 py-3 rounded-2xl shadow-lg shadow-black/15 max-w-sm text-left ${STYLES[type]}`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="text-sm font-semibold leading-snug">{message}</span>
                <X className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};