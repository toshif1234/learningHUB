import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { usersAPI } from '../api/users';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const logout = useCallback(() => {
    window.__accessToken = null;
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access_token, refresh_token } = response.data;
    window.__accessToken = access_token;
    localStorage.setItem('refreshToken', refresh_token);

    const profileRes = await usersAPI.getMe();
    dispatch({ type: 'SET_USER', payload: profileRes.data });
    return response.data;
  }, []);

  const signup = useCallback(async (data) => {
    const response = await authAPI.signup(data);
    return response.data;
  }, []);

  const verifyOTP = useCallback(async (data) => {
    const response = await authAPI.verifyOTP(data);
    const { access_token, refresh_token } = response.data;
    window.__accessToken = access_token;
    localStorage.setItem('refreshToken', refresh_token);

    const profileRes = await usersAPI.getMe();
    dispatch({ type: 'SET_USER', payload: profileRes.data });
    return response.data;
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        const response = await authAPI.refresh({ refresh_token: refreshToken });
        const { access_token, refresh_token: newRefresh } = response.data;
        window.__accessToken = access_token;
        localStorage.setItem('refreshToken', newRefresh);

        const profileRes = await usersAPI.getMe();
        dispatch({ type: 'SET_USER', payload: profileRes.data });
      } catch (error) {
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, signup, verifyOTP }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
