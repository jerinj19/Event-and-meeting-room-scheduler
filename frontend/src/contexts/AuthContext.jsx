import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user_info');
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // In a real app, you would make an API call here: POST /api/auth/token/
    // For now, we simulate a successful login
    if (email && password) {
      const mockUser = { id: 1, email, name: 'Prashanth Kolla' };
      localStorage.setItem('access_token', 'mock_jwt_token_123');
      localStorage.setItem('user_info', JSON.stringify(mockUser));
      
      setUser(mockUser);
      setIsAuthenticated(true);
      toast.success('Successfully logged in!');
      return true;
    }
    toast.error('Invalid credentials');
    return false;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    setUser(null);
    setIsAuthenticated(false);
    toast.info('You have been logged out.');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
