import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { getMsalInstance, isMsalConfigured, loginWithMicrosoftRedirect } from '../services/msalService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    // 1. Check for existing local session token
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }

    // 2. Process Microsoft 365 OAuth 2.0 redirect response (if returning from login.microsoftonline.com)
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

            // Navigate to the Access Denied / Contact Admin screen with details
            window.location.href = `/access-denied?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}&domain=${encodeURIComponent(domain)}&message=${encodeURIComponent(msg)}&adminContact=${encodeURIComponent(adminContact)}`;
            return;
          }

          // Successful Microsoft SSO authentication:
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          localStorage.setItem('user', JSON.stringify(data.user));

          setUser(data.user);
          setIsAuthenticated(true);
          toast.success('Successfully signed in with Microsoft 365!');

          // Navigate directly to dashboard or admin
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
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/token/`, {
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
      const response = await fetch(`${API_BASE}/auth/register/`, {
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

  const loginWithMicrosoft = async () => {
    // Triggers standard OAuth 2.0 full-page redirect to Microsoft Entra ID
    await loginWithMicrosoftRedirect();
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
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, loginWithMicrosoft }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
