import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BookRoom from './pages/BookRoom';
import RoomCatalog from './pages/RoomCatalog';
import AppShell from './components/layout/AppShell';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Jerin's Room & Asset Management Module */}
        <Route
          path="/"
          element={
            <AppShell>
              <RoomCatalog />
            </AppShell>
          }
        />
        <Route
          path="/rooms"
          element={
            <AppShell>
              <RoomCatalog />
            </AppShell>
          }
        />

        {/* Teammates' Modules */}
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/book" 
          element={
            <AppShell>
              <BookRoom />
            </AppShell>
          } 
        />
        <Route 
          path="/book/:roomId" 
          element={
            <AppShell>
              <BookRoom />
            </AppShell>
          } 
        />

        {/* Fallback to Room Catalog */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

