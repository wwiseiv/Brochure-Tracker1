import { useState, useEffect, useCallback } from "react";

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

const TOKEN_KEY = "pcb_auto_token";

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function useAutoAuth() {
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

    fetch("/api/auto/auth/me", {
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

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auto/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, shop: data.shop, token: data.token, isLoading: false });
    return data;
  };

  const register = async (token: string, firstName: string, lastName: string, password: string, phone?: string) => {
    const res = await fetch("/api/auto/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, firstName, lastName, password, phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");

    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, shop: data.shop, token: data.token, isLoading: false });
    return data;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, shop: null, token: null, isLoading: false });
  };

  return { ...state, login, register, logout, autoFetch };
}

export type { AutoUser, AutoShop };
