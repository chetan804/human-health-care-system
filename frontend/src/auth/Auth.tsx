import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, setToken, setFacility, refresh, onExpired } from "../api/client";
import type { User, Facility } from "../api/client";
interface AuthState {
  user: User | null;
  facility: Facility | null;
  loading: boolean;
  expired: boolean;
  login: (
    email: string,
    password: string,
    secondFactor?: string,
  ) => Promise<void>;
  forgetSession: () => void;
  logout: () => Promise<void>;
  switchFacility: (id: string) => void;
}
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [scope, setScope] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiry, setExpiry] = useState(false);
  function adopt(value: User) {
    setUser(value);
    setScope(value.facilities[0] ?? null);
    setFacility(value.facilities[0]?.id ?? null);
  }
  function clear() {
    setToken(null);
    setFacility(null);
    setUser(null);
    setScope(null);
    queryClient.clear();
  }
  useEffect(() => {
    let active = true;
    onExpired(() => {
      clear();
      setExpiry(true);
    });
    refresh()
      .then(() => api.get<User>("/auth/me"))
      .then((value) => {
        if (active) adopt(value);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // Initialization runs once. Tokens never enter persistent browser storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function login(email: string, password: string, secondFactor?: string) {
    const data = await api.post<{ access_token: string }>("/auth/login", {
      email,
      password,
      second_factor: secondFactor,
    });
    setToken(data.access_token);
    adopt(await api.get<User>("/auth/me"));
    setExpiry(false);
    queryClient.clear();
  }
  async function logout() {
    await api.post("/auth/logout");
    clear();
  }
  function switchFacility(id: string) {
    const next = user?.facilities.find((f) => f.id === id);
    if (next) {
      setFacility(id);
      setScope(next);
      queryClient.clear();
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        facility: scope,
        loading,
        expired: expiry,
        login,
        forgetSession: clear,
        logout,
        switchFacility,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Auth provider missing");
  return value;
}
