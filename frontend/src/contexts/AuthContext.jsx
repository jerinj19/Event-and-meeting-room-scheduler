import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const toast = useToast();

  const logout = useCallback((showToast = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    if (showToast) {
      toast.info('You have been logged out.');
    }
  }, [toast]);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      // Silently refresh the latest user data from server to catch role/ownership changes
      fetch('http://localhost:8000/api/auth/me/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      })
      .catch(() => {
        // If token is invalid, we might want to log out, but for now we rely on interceptors
      });
    }
  }, []);

  // INACTIVITY & TOKEN REFRESH LOGIC
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

    // Check inactivity every 1 minute
    const inactivityInterval = setInterval(() => {
      const storedLastActivity = parseInt(localStorage.getItem('last_activity') || '0', 10);
      const inactiveTime = Date.now() - storedLastActivity;
      
      // 60 minutes = 3600000 ms
      if (inactiveTime > 3600000) {
        logout(false);
        toast.error('Session expired due to inactivity');
      }
    }, 60000);

    // Refresh token every 25 minutes (1500000 ms) since default token lives 30 mins
    const refreshTokenInterval = setInterval(async () => {
      const storedLastActivity = parseInt(localStorage.getItem('last_activity') || '0', 10);
      const inactiveTime = Date.now() - storedLastActivity;
      const refreshToken = localStorage.getItem('refresh_token');
      
      // Only refresh if we haven't expired the 1-hour session limit
      if (inactiveTime <= 3600000 && refreshToken) {
        try {
          const res = await fetch('http://localhost:8000/api/auth/token/refresh/', {
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
      const response = await fetch('http://localhost:8000/api/auth/token/', {
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
      const response = await fetch('http://localhost:8000/api/auth/google/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: credential })
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
      const response = await fetch('http://localhost:8000/api/auth/register/', {
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
        throw new Error('Registration failed. Email might already exist.');
      }

      await login(email, password);
    } catch (error) {
      toast.error(error.message || 'Failed to register');
      throw error;
    }
  }, [login, toast]);

  const updateUser = useCallback((updatedUserData) => {
    localStorage.setItem('user', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  }, []);

  const value = React.useMemo(() => ({
    isAuthenticated, user, login, googleLogin, register, logout, updateUser
  }), [isAuthenticated, user, login, googleLogin, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
