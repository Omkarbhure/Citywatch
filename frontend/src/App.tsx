import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import UserProfile from './components/UserProfile';
import Dashboard from './components/Dashboard';
import IncidentForm from './components/IncidentForm';
import IncidentFeed from './components/IncidentFeed';
import IncidentMap from './components/IncidentMap';
import AuthorityDashboard from './components/AuthorityDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';

import Layout from './components/Layout';

function App() {
  return (
    <AuthProvider>
      <div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <UserProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <Layout>
                  <IncidentForm />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <Layout>
                  <IncidentFeed />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <Layout>
                  <IncidentMap />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/authority"
            element={
              <ProtectedRoute>
                <RequireRole role="authority">
                  <Layout>
                    <AuthorityDashboard />
                  </Layout>
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/authority/analytics"
            element={
              <ProtectedRoute>
                <RequireRole role="authority">
                  <Layout>
                    <AnalyticsDashboard />
                  </Layout>
                </RequireRole>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;