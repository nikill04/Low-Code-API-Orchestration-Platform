import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('orchestrator_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('orchestrator_token', data.data.token);
    localStorage.setItem('orchestrator_user', JSON.stringify(data.data.user));
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('orchestrator_token');
    localStorage.removeItem('orchestrator_user');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
