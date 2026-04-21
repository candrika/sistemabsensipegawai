import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export interface AppSettings {
  id: number;
  appName: string;
  appSubtitle: string;
  appDescription: string;
  logoPath: string | null;
  updatedAt: string;
}

interface SettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const DEFAULT: AppSettings = {
  id: 0,
  appName: "SI Kepegawaian",
  appSubtitle: "ENTERPRISE",
  appDescription:
    "Platform terintegrasi untuk pengelolaan data pegawai, kehadiran, dokumen, inventori, dan keluhan pelanggan.",
  logoPath: null,
  updatedAt: new Date().toISOString(),
};

const base = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${base()}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // diamkan, gunakan default
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
