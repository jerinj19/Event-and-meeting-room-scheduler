import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthView from './pages/AuthView';
import DashboardWelcome from './pages/DashboardWelcome';
import MyBookingsView from './pages/MyBookingsView';
import AdminDashboard from './pages/AdminDashboard';
import AdminBookings from './pages/AdminBookings';
import { useAuth } from './contexts/AuthContext';

// Layout and Teammates' components
import AppShell from './components/layout/AppShell';
import AdminAppShell from './components/admin/AdminAppShell';
import BookRoom from './pages/BookRoom';
import RoomCatalog from './pages/RoomCatalog';

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
              <AppShell>
                <DashboardWelcome />
              </AppShell>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/my-bookings" 
          element={
            <ProtectedRoute>
              <AppShell>
                <MyBookingsView />
              </AppShell>
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
          path="/book" 
          element={
            <ProtectedRoute>
              <AppShell>
                <BookRoom />
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
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminAppShell>
                <AdminDashboard />
              </AdminAppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/bookings" 
          element={
            <ProtectedRoute>
              <AdminAppShell>
                <AdminBookings />
              </AdminAppShell>
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
