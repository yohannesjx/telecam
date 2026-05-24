"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import {
  assertDashboardAccess,
  changePassword as changePasswordRequest,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
} from "@/lib/auth/auth-api";
import { publicRoutes } from "@/lib/routes";
import {
  clearAuthStorage,
  getStoredRefreshToken,
  getStoredUser,
  setStoredRefreshToken,
  setStoredUser,
} from "@/lib/auth/storage";
import {
  registerLogoutHandler,
  registerRefreshHandler,
  setAccessToken,
} from "@/lib/auth/session-store";
import type { AuthUser } from "@/lib/auth/types";
import { GENERIC_LOGIN_ERROR } from "@/lib/auth/types";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<string | null>;
  loadSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessTokenState(null);
    setRefreshTokenState(null);
    setAccessToken(null);
    clearAuthStorage();
  }, []);

  const applySession = useCallback(
    (nextAccess: string, nextRefresh: string, nextUser: AuthUser) => {
      assertDashboardAccess(nextUser);
      setAccessToken(nextAccess);
      setAccessTokenState(nextAccess);
      setRefreshTokenState(nextRefresh);
      setStoredRefreshToken(nextRefresh);
      setStoredUser(nextUser);
      setUser(nextUser);
    },
    [],
  );

  const refreshSession = useCallback(async (): Promise<string | null> => {
    const storedRefresh = getStoredRefreshToken();
    if (!storedRefresh) {
      clearSession();
      return null;
    }

    const refreshed = await refreshRequest(storedRefresh);
    const nextRefresh = refreshed.refresh_token ?? storedRefresh;
    let nextUser = refreshed.user ?? getStoredUser();

    if (!nextUser) {
      nextUser = await getMe(refreshed.access_token);
    }

    applySession(refreshed.access_token, nextRefresh, nextUser);
    return refreshed.access_token;
  }, [applySession, clearSession]);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedRefresh = getStoredRefreshToken();
      if (!storedRefresh) {
        clearSession();
        return;
      }
      setRefreshTokenState(storedRefresh);
      await refreshSession();
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession, refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginRequest(email, password);
        applySession(result.access_token, result.refresh_token, result.user);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          throw err;
        }
        throw new ApiError(GENERIC_LOGIN_ERROR, 401);
      }
    },
    [applySession],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const updatedUser = await changePasswordRequest(currentPassword, newPassword);
      assertDashboardAccess(updatedUser);
      const storedRefresh = getStoredRefreshToken();
      if (!storedRefresh) {
        clearSession();
        return;
      }
      const token = accessToken ?? (await refreshSession());
      if (token) {
        setStoredUser(updatedUser);
        setUser(updatedUser);
      }
    },
    [accessToken, clearSession, refreshSession],
  );

  const logout = useCallback(async () => {
    const storedRefresh = getStoredRefreshToken();
    const token = accessToken ?? undefined;
    clearSession();
    if (storedRefresh) {
      try {
        await logoutRequest(storedRefresh, token);
      } catch {
        // Local session is already cleared.
      }
    }
    router.replace(publicRoutes.login);
  }, [accessToken, clearSession, router]);

  const handleSessionExpired = useCallback(() => {
    clearSession();
    router.replace(publicRoutes.login);
  }, [clearSession, router]);

  useEffect(() => {
    registerRefreshHandler(async () => {
      try {
        return await refreshSession();
      } catch {
        handleSessionExpired();
        return null;
      }
    });
    registerLogoutHandler(handleSessionExpired);
    void loadSession();
    return () => {
      registerRefreshHandler(null);
      registerLogoutHandler(null);
    };
  }, [handleSessionExpired, loadSession, refreshSession]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!user || !refreshToken) return;

    intervalRef.current = setInterval(() => {
      void refreshSession().catch(() => handleSessionExpired());
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleSessionExpired, refreshSession, refreshToken, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      login,
      logout,
      changePassword,
      refreshSession,
      loadSession,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isLoading,
      login,
      logout,
      changePassword,
      refreshSession,
      loadSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
