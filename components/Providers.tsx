"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SessionProvider>
      <ToastContext.Provider value={{ toast }}>
        {children}
        
        {/* Floating Toast Notification Area */}
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={removeToast} />
          ))}
        </div>
      </ToastContext.Provider>
    </SessionProvider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const typeStyles = {
    success: "border-emerald-500/30 text-emerald-400 bg-emerald-950/40",
    error: "border-rose-500/30 text-rose-400 bg-rose-950/40",
    info: "border-blue-500/30 text-blue-400 bg-blue-950/40",
  };

  return (
    <div
      className={`mx-4 md:mx-0 p-4 rounded-xl border glass-panel backdrop-blur-md shadow-2xl pointer-events-auto flex justify-between items-center animate-slide-in-right transition-all duration-300 ${typeStyles[toast.type]}`}
    >
      <div className="flex items-center gap-2">
        {toast.type === "success" && (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {toast.type === "error" && (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {toast.type === "info" && (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-4 hover:opacity-75 transition-opacity pointer-events-auto text-current"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
