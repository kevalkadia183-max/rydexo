import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, setApiToken } from '@/services/api';
import { fullSync } from '@/services/cloudSync';
import type { AuthUser } from '@/services/api';

const AUTH_TOKEN_KEY = 'velotrack:auth_token';
const AUTH_USER_KEY = 'velotrack:auth_user';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isSignedIn: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setApiToken(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
          // Validate the token and sync data in the background
          authApi.me()
            .then((res) => fullSync(res.user.id).catch(() => {}))
            .catch(() => {
              // Token invalid — clear silently
              setApiToken(null);
              setToken(null);
              setUser(null);
              AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
            });
        }
      } catch {
        // ignore errors restoring session
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (t: string, u: AuthUser) => {
    setApiToken(t);
    setToken(t);
    setUser(u);
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, t),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(u)),
    ]);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await persist(res.token, res.user);
  }, [persist]);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await authApi.register(email, password);
    await persist(res.token, res.user);
  }, [persist]);

  const signOut = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSignedIn: !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
