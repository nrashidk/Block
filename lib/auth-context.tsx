import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { apiRequest, getApiUrl } from "./query-client";

interface AuthUser {
  id: string;
  username: string;
  eloRating: number;
  league: string;
  coins: number;
  gems: number;
  wins: number;
  losses: number;
  draws: number;
  vipActive: boolean;
  xp?: number;
  level?: number;
  isGuest?: boolean;
  authProvider?: string;
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  loginWithSocial: (provider: string, providerId: string, displayName: string, idToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.warn("Auth check failed:", e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", {
      username,
      password,
    });
    const data = await res.json();
    setUser(data);
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      const res = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
      });
      const data = await res.json();
      setUser(data);
    },
    []
  );

  const loginAsGuest = useCallback(async () => {
    const res = await apiRequest("POST", "/api/auth/guest");
    const data = await res.json();
    setUser(data);
  }, []);

  const loginWithSocial = useCallback(
    async (provider: string, providerId: string, displayName: string, idToken?: string) => {
      const res = await apiRequest("POST", "/api/auth/social", {
        provider,
        providerId,
        displayName,
        idToken,
      });
      const data = await res.json();
      setUser(data);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginAsGuest, loginWithSocial, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
