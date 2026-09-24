import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from './ToastContext';
import { getMsalInstance, isMsalConfigured, loginWithMicrosoftRedirect } from '../services/msalService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const toast = useToast();

  const logout = useCallback((showToast = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('last_activity');
    setIsAuthenticated(false);
    setUser(null);
    if (showToast) {
      toast.info('You have been logged out.');
    }
  }, [toast]);

  // Initial authentication check & Microsoft MSAL redirect processing
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const storedUser = localStorage.getItem('user');

    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // Corrupted local storage
        }
      }

      // Verify token validity with backend & refresh latest user details
      fetch(`${API_BASE}/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(async (res) => {
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          setIsAuthenticated(true);
        } else if (res.status === 401 && refreshToken) {
          const refRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });
          if (refRes.ok) {
            const refData = await refRes.json();
            localStorage.setItem('access_token', refData.access);
            if (refData.refresh) {
              localStorage.setItem('refresh_token', refData.refresh);
            }
            setIsAuthenticated(true);
          } else {
            logout(false);
          }
        } else if (res.status === 401) {
          logout(false);
        }
      }).catch(() => {
        // Network failure, keep offline cache
      });
    }

    // Process Microsoft 365 OAuth 2.0 redirect response
    const processMsalRedirect = async () => {
      if (!isMsalConfigured()) return;
      try {
        const pca = await getMsalInstance();
        const response = await pca.handleRedirectPromise();

        if (response && (response.accessToken || response.idToken)) {
          const msToken = response.accessToken || response.idToken;

          const res = await fetch(`${API_BASE}/auth/microsoft/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: msToken }),
          });

          const data = await res.json();

          if (!res.ok) {
            const errorInfo = data.error || {};
            const code = errorInfo.code || 'USER_NOT_REGISTERED';
            const email = errorInfo.email || response.account?.username || '';
            const domain = errorInfo.domain || '';
            const msg = errorInfo.message || 'Access restricted. Please contact your administrator.';
            const adminContact = errorInfo.admin_contact || 'admin@innovyx.com';

            window.location.href = `/access-denied?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}&domain=${encodeURIComponent(domain)}&message=${encodeURIComponent(msg)}&adminContact=${encodeURIComponent(adminContact)}`;
            return;
          }

          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          localStorage.setItem('user', JSON.stringify(data.user));

          setUser(data.user);
          setIsAuthenticated(true);
          toast.success('Successfully signed in with Microsoft 365!');

          if (data.user?.is_staff) {
            window.location.href = '/admin';
          } else {
            window.location.href = '/dashboard';
          }
        }
      } catch (err) {
        console.error('Error processing Microsoft SSO redirect:', err);
        toast.error(err.message || 'Failed to complete Microsoft sign-in.');
      }
    };

    processMsalRedirect();
  }, [logout, toast]);

  // Inactivity tracking (60 min timeout) & token refresh interval (25 mins)
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastActivityTime = Date.now();
    localStorage.setItem('last_activity', lastActivityTime);

    const updateActivity = () => {
      lastActivityTime = Date.now();
      localStorage.setItem('last_activity', lastActivityTime);
    };

    let throttleTimer;
    const handleUserActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateActivity();
        throttleTimer = null;
      }, 5000);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const inactivityInterval = setInterval(() => {
      const storedLastActivity = parseInt(localStorage.getItem('last_activity') || '0', 10);
      const inactiveTime = Date.now() - storedLastActivity;

      // 60 minutes = 3,600,000 ms
      if (inactiveTime > 3600000) {
        logout(false);
        toast.error('Session expired due to inactivity');
      }
    }, 60000);

    const refreshTokenInterval = setInterval(async () => {
      const storedLastActivity = parseInt(localStorage.getItem('last_activity') || '0', 10);
      const inactiveTime = Date.now() - storedLastActivity;
      const refreshToken = localStorage.getItem('refresh_token');

      if (inactiveTime <= 3600000 && refreshToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('access_token', data.access);
            if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
          } else {
            logout(false);
            toast.error('Session expired. Please log in again.');
          }
        } catch (e) {
          console.error('Failed to refresh token', e);
        }
      }
    }, 1500000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(inactivityInterval);
      clearInterval(refreshTokenInterval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [isAuthenticated, logout, toast]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || errorData.detail || errorData.error || 'Invalid email or password';
        throw new Error(typeof message === 'object' ? JSON.stringify(message) : message);
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

      const realUser = data.user;
      localStorage.setItem('user', JSON.stringify(realUser));

      setUser(realUser);
      setIsAuthenticated(true);
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error(error.message || 'Failed to login');
      throw error;
    }
  }, [toast]);

  const googleLogin = useCallback(async (credential) => {
    try {
      const response = await fetch(`${API_BASE}/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: credential, token: credential })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error?.message || errorData.detail || errorData.error || 'Google Login Failed';
        throw new Error(typeof message === 'object' ? JSON.stringify(message) : message);
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

      const realUser = data.user;
      localStorage.setItem('user', JSON.stringify(realUser));

      setUser(realUser);
      setIsAuthenticated(true);
      toast.success('Successfully logged in with Google!');
    } catch (error) {
      toast.error(error.message || 'Failed to login with Google');
      throw error;
    }
  }, [toast]);

  const register = useCallback(async (email, password, confirmPassword, firstName, lastName, department) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          confirm_password: confirmPassword,
          first_name: firstName,
          last_name: lastName,
          department
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || errorData.detail || errorData.error || 'Registration failed. Email might already exist.';
        throw new Error(typeof msg === 'object' ? JSON.stringify(msg) : msg);
      }

      await login(email, password);
    } catch (error) {
      toast.error(error.message || 'Failed to register');
      throw error;
    }
  }, [login, toast]);

  const loginWithMicrosoft = async () => {
    await loginWithMicrosoftRedirect();
  };

  const updateUser = useCallback((updatedUserData) => {
    localStorage.setItem('user', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    user,
    login,
    googleLogin,
    register,
    logout,
    loginWithMicrosoft,
    updateUser
  }), [isAuthenticated, user, login, googleLogin, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
