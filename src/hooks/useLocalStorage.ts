import { useState, useEffect } from "react";

// ─── Hook genérico de persistência em localStorage ────────────────────────────
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota excedida — ignora */ }
  }, [key, value]);

  return [value, setValue] as const;
}