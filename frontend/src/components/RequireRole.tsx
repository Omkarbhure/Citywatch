import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireRoleProps {
  role?: 'authority' | 'citizen';
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role = 'authority', children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Verifying role permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== role) {
    // If not matching authorized role, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RequireRole;
