import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { apolloClient } from '../apollo/client';

type AuthContextValue = { token: string | null; loading: boolean; signIn: (token: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { SecureStore.getItemAsync('teacher-hub-token').then(setToken).finally(() => setLoading(false)); }, []);
  const value = useMemo(() => ({ token, loading, signIn: async (next: string) => { await apolloClient.clearStore(); await SecureStore.setItemAsync('teacher-hub-token', next); setToken(next); }, signOut: async () => { await SecureStore.deleteItemAsync('teacher-hub-token'); await apolloClient.clearStore(); setToken(null); } }), [token, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
