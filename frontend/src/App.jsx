import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthView from './pages/AuthView';
import MyBookingsView from './pages/MyBookingsView';
import { useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthView />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <MyBookingsView />
            </ProtectedRoute>
          } 
        />
        {/* Placeholder for Srilaxmi's booking page
        <Route 
          path="/book" 
          element={
            <ProtectedRoute>
              <BookRoom />
            </ProtectedRoute>
          } 
        />
        */}
      </Routes>
    </Router>
  );
}
