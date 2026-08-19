import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '@/services/storage';
import { uploadSettings } from '@/services/cloudSync';
import type { Settings } from '@/models/types';

interface AppContextType {
  settings: Settings;
  isLoading: boolean;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await saveSettings(partial);
    uploadSettings(updated).catch(() => {});
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  return (
    <AppContext.Provider value={{ settings, isLoading, updateSettings, refreshSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
