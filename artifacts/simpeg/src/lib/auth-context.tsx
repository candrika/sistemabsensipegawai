import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AuthUser {
  id: number;
  username: string;
  roleId: number;
  roleName: string | null;
  roleDescription: string | null;
  employeeId: number | null;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "simpeg_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Login gagal");
    }
    const data: AuthUser = await res.json();
    setUser(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasPermission = (resource: string, action: string) => {
    if (!user) return false;
    if (user.roleName === "admin") return true;
    return user.permissions.includes(`${resource}:${action}`);
  };

  const isAdmin = () => user?.roleName === "admin";

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
