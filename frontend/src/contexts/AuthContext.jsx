import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
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
      
      // We don't get the user payload in the token response without decoding or a /me endpoint,
      // so we'll just mock the user object for the UI for now
      const mockUser = { id: '1', email, name: email.split('@')[0], department: 'Engineering' };
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      setUser(mockUser);
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
