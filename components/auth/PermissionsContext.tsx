// src/components/auth/PermissionsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, clearToken, getStoredToken } from '../../apiClient';
import { User as Profile, PageId } from '../../types';
import { PERMISSION_PARENT_MAP } from '../../config/pages';

type Action = 'view' | 'create' | 'edit' | 'delete';

interface PermissionsContextType {
  currentProfile: Profile | null;
  currentUser: Profile | null;
  loading: boolean;
  hasPermission: (pageId: string, action: Action) => boolean;
  refetchProfile: () => void;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) { setCurrentProfile(null); setLoading(false); return; }
    try {
      const profile = await api.get<Profile>('/api/auth/me');
      setCurrentProfile(profile);
    } catch {
      clearToken();
      setCurrentProfile(null);
      window.dispatchEvent(new Event('crm:logout'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    window.addEventListener('focus', fetchProfile);
    return () => window.removeEventListener('focus', fetchProfile);
  }, [fetchProfile]);

  const hasPermission = useCallback((pageId: string, action: Action): boolean => {
    if (!currentProfile) return false;
    if (currentProfile.role === 'Admin') return true;
    if (currentProfile.role === 'Client') {
        const clientBasePages = ['dashboard', 'web-dashboard', 'app-dashboard', 'marketing-dashboard', 'seo-dashboard', 'software-dashboard'];
        if (clientBasePages.includes(pageId)) return true;
    }
    
    // For Staff, Clients and any Custom Roles
    if (!currentProfile.permissions) return false;
    
    // Direct permission check
    const directPerm = currentProfile.permissions[pageId as PageId];
    if (directPerm) return directPerm[action] === true;
    
    // Fall-through: check parent permission for child pages
    const parentId = PERMISSION_PARENT_MAP[pageId];
    if (parentId) {
      const parentPerm = currentProfile.permissions[parentId as PageId];
      if (parentPerm) return parentPerm[action] === true;
    }
    return false;
  }, [currentProfile]);

  const value = { currentProfile, currentUser: currentProfile, loading, hasPermission, refetchProfile: fetchProfile };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) throw new Error('usePermissions must be used within a PermissionsProvider');
  return context;
};