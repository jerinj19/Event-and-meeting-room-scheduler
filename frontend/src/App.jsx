import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthView from './pages/AuthView';
import MyBookingsView from './pages/MyBookingsView';
import { useAuth } from './contexts/AuthContext';

// Teammates' components
import BookRoom from './pages/BookRoom';
import RoomCatalog from './pages/RoomCatalog';
import AppShell from './components/layout/AppShell';

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
        
        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <AppShell>
                <RoomCatalog />
              </AppShell>
            </ProtectedRoute>
          }
        />
        
        <Route 
          path="/book/:roomId" 
          element={
            <ProtectedRoute>
              <AppShell>
                <BookRoom />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
