import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch {
        // Corrupted user storage
      }
    }

    // Verify token validity with backend
    fetch('http://localhost:8000/api/auth/me/', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (res) => {
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setIsAuthenticated(true);
      } else if (res.status === 401 && refreshToken) {
        // Try transparent token refresh
        const refRes = await fetch('http://localhost:8000/api/auth/token/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken })
        });
        if (refRes.ok) {
          const refData = await refRes.json();
          localStorage.setItem('access_token', refData.access);
          setIsAuthenticated(true);
        } else {
          // Token expired and cannot be refreshed
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUser(null);
        }
      } else if (res.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    }).catch(() => {
      // Network failure, retain local session
    });
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      
      // Extract user from token response
      const realUser = data.user;
      localStorage.setItem('user', JSON.stringify(realUser));
      
      setUser(realUser);
      setIsAuthenticated(true);
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error(error.message || 'Failed to login');
      throw error;
    }
  };

  const register = async (email, password, firstName, lastName, department) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          first_name: firstName, 
          last_name: lastName, 
          department 
        })
      });

      if (!response.ok) {
        throw new Error('Registration failed. Email might already exist.');
      }

      // Automatically log them in after registration
      await login(email, password);
    } catch (error) {
      toast.error(error.message || 'Failed to register');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    toast.info('You have been logged out.');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
