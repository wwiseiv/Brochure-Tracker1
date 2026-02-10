import { useState, useEffect, useCallback, createContext, useContext } from "react";

interface AutoUser {
  id: number;
  shopId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AutoShop {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  taxRate: string;
  laborRate: string;
  cardFeePercent: string;
}

interface AutoAuthState {
  user: AutoUser | null;
  shop: AutoShop | null;
  token: string | null;
  isLoading: boolean;
}

interface AutoAuthContextValue extends AutoAuthState {
  login: (email: string, password: string) => Promise<any>;
  register: (token: string, firstName: string, lastName: string, password: string, phone?: string) => Promise<any>;
  logout: () => void;
  autoFetch: (url: string, options?: RequestInit & { rawBody?: boolean }) => Promise<Response>;
}

const TOKEN_KEY = "pcb_auto_token";

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const AutoAuthContext = createContext<AutoAuthContextValue | null>(null);

export function AutoAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AutoAuthState>({
    user: null,
    shop: null,
    token: getStoredToken(),
    isLoading: true,
  });

  const autoFetch = useCallback(async (url: string, options: RequestInit & { rawBody?: boolean } = {}) => {
    const token = getStoredToken();
    const { rawBody, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      ...(rawBody ? {} : { "Content-Type": "application/json" }),
      ...(fetchOptions.headers as Record<string, string> || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    
    const res = await fetch(url, { ...fetchOptions, headers });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      setState({ user: null, shop: null, token: null, isLoading: false });
      throw new Error("Unauthorized");
    }
    return res;
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState({ user: null, shop: null, token: null, isLoading: false });
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        setState({ user: data.user, shop: data.shop, token, isLoading: false });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, shop: null, token: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, shop: data.shop, token: data.token, isLoading: false });
    return data;
  }, []);

  const register = useCallback(async (token: string, firstName: string, lastName: string, password: string, phone?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firstName, lastName, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");

    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, shop: data.shop, token: data.token, isLoading: false });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, shop: null, token: null, isLoading: false });
  }, []);

  const value: AutoAuthContextValue = {
    ...state,
    login,
    register,
    logout,
    autoFetch,
  };

  return (
    <AutoAuthContext.Provider value={value}>
      {children}
    </AutoAuthContext.Provider>
  );
}

export function useAutoAuth(): AutoAuthContextValue {
  const context = useContext(AutoAuthContext);
  if (!context) {
    throw new Error("useAutoAuth must be used within an AutoAuthProvider");
  }
  return context;
}

export type { AutoUser, AutoShop };
