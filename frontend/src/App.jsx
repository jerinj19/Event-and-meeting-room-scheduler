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
import AdminRoomsPage from './pages/AdminRoomsPage';
import AdminTimeSlotsPage from './pages/AdminTimeSlotsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  // Allow if user is staff or if profile is still loading/defaulting
  if (user && user.is_staff === false) {
    return <Navigate to="/dashboard" replace />;
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
            <AdminRoute>
              <AdminAppShell>
                <AdminDashboard />
              </AdminAppShell>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/rooms" 
          element={
            <AdminRoute>
              <AdminAppShell>
                <AdminRoomsPage />
              </AdminAppShell>
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/time-slots" 
          element={
            <AdminRoute>
              <AdminAppShell>
                <AdminTimeSlotsPage />
              </AdminAppShell>
            </AdminRoute>
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
