import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '@/services/authService';

const AuthContext = createContext(null);

const FRONTEND_USER_MAP = {};

function frontendRoleFor(user) {
  const platformRole = user?.role;
  const profileRole = user?.profile?.role || user?.employee_role || user?.employeeRole;
  if (platformRole === 'super_admin') return 'admin';
  if (platformRole === 'factory') return 'industry';
  if (platformRole === 'supplier') return 'supplier';
  if (platformRole === 'employee') {
    if (profileRole === 'driver') return 'driver';
    if (profileRole === 'hub_manager') return 'hub_manager';
    return profileRole || 'employee';
  }
  return platformRole;
}

function displayNameFor(user) {
  const combined = `${user?.fname || ''} ${user?.lname || ''}`.trim();
  return user?.name || combined || user?.email || 'User';
}

function normalizeUser(user) {
  if (!user) return null;
  const email = (user.email || '').toLowerCase();
  const mapped = FRONTEND_USER_MAP[email] || {};
  const normalizedRole = frontendRoleFor(user);
  return {
    ...user,
    ...mapped,
    id: mapped.id || user.frontendId || `api-user-${user.id || Date.now()}`,
    platformId: user.platformId || user.id,
    name: displayNameFor(user),
    role: normalizedRole,
    platformRole: user.role,
    employeeRole: user?.profile?.role || user?.employeeRole,
    company: user?.profile?.company_name || user?.company || user?.company_name || '',
    phone: user?.phone || '',
    plate: user?.profile?.driver_license_number || user?.plate_number || mapped.plate,
  };
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    const storedToken = authService.getStoredToken();
    const storedUser = normalizeUser(authService.getStoredUser());

    if (storedToken === 'frontend-demo-token') {
      authService.clearStoredAuth();
      setUser(null);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }

    if (!storedToken) {
      setUser(null);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }

    if (storedUser) {
      setUser(storedUser);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return storedUser;
    }

    try {
      setIsLoadingAuth(true);
      const apiUser = await authService.getCurrentUser();
      const normalized = normalizeUser(apiUser) || storedUser;
      setUser(normalized);
      setAuthError(null);
      return normalized;
    } catch (error) {
      authService.clearStoredAuth();
      setUser(null);
      setAuthError({ type: 'auth_required', message: error.message });
      return null;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const login = useCallback(async (payload) => {
    const data = await authService.login(payload);
    let normalized = normalizeUser(data?.user || authService.getStoredUser());

    if (normalized) {
      const token = data?.token || authService.getStoredToken();
      authService.setStoredAuth(token, normalized);
    }

    setUser(normalized);
    setAuthError(null);
    setAuthChecked(true);
    return normalized;
  }, []);

  // Public registration is not direct auth in platform v1. It returns an application object.
  const register = useCallback(async (payload) => authService.register(payload), []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setAuthError(null);
    setAuthChecked(true);
  }, []);

  const value = useMemo(() => ({
    user,
    currentUser: user,
    isAuthenticated: !!user,
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError,
    authChecked,
    login,
    register,
    logout,
    checkUserAuth,
    navigateToLogin: () => { window.location.href = '/login'; },
  }), [user, isLoadingAuth, authError, authChecked, login, register, logout, checkUserAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
