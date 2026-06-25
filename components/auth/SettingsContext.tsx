// src/components/auth/SettingsContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../../apiClient';

interface CompanySettings {
  company_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  invoice_prefix: string | null;
  terms_and_conditions: string | null;
}

interface SettingsContextType {
  settings: CompanySettings | null;
  loading: boolean;
  refetchSettings: () => Promise<void>; // <-- ADD THIS FUNCTION TO THE TYPE
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Wrap fetchSettings in useCallback so it can be exported without changing on every render
  const fetchSettings = useCallback(async () => {
    // Don't set loading to true on refetch, to avoid UI flicker
    try {
      const data = await api.get('/api/settings');
      setSettings(data);
    } catch (err: any) {
      console.error("Error fetching company settings:", err.message || err);
    }
    setLoading(false); // Ensure loading is false after fetch
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSettings();
  }, [fetchSettings]);

  const value = { 
    settings, 
    loading, 
    refetchSettings: fetchSettings // <-- EXPORT THE FUNCTION
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};