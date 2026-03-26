"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  getCurrentUser,
  logout as apiLogout,
  startGoogleAuth,
  UserResponse,
} from "../lib/api/auth";

export interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserResponse | null>;
}

const guestAuthContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  loginError: null,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => null,
};

export const AuthContext = createContext<AuthContextValue>(guestAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const login = useCallback(async () => {
    setLoginError(null);
    try {
      const { auth_url } = await startGoogleAuth();
      window.location.href = auth_url;
    } catch (err) {
      console.error("Failed to start Google auth:", err);
      setLoginError("Sign-in unavailable. Please try again shortly.");
    }
  }, []);

  const logoutFn = useCallback(async () => {
    await apiLogout();
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginError,
        login,
        logout: logoutFn,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
