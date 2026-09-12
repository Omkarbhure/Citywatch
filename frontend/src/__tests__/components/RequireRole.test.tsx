import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireRole } from '../../components/RequireRole';
import ProtectedRoute from '../../components/ProtectedRoute';
import * as AuthContextModule from '../../context/AuthContext';

describe('RequireRole & ProtectedRoute Component Tests', () => {
  const renderWithRouter = (ui: React.ReactElement, initialPath = '/protected') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Citizen Dashboard</div>} />
          <Route path="/protected" element={ui} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('ProtectedRoute: renders loading state when auth is loading', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('ProtectedRoute: redirects unauthenticated guest to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('ProtectedRoute: renders protected children when user is authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'citizen' },
      token: 'valid-token',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Secret Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('RequireRole (AUTH-10): citizen attempting authority route redirects to /dashboard', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'citizen' },
      token: 'valid-token',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <RequireRole role="authority">
        <div>Authority Admin Panel</div>
      </RequireRole>
    );

    expect(screen.getByText('Citizen Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Authority Admin Panel')).not.toBeInTheDocument();
  });

  it('RequireRole: authority user accessing authority route renders children', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'a1', name: 'Officer Smith', email: 'smith@city.gov', role: 'authority' },
      token: 'valid-token',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(
      <RequireRole role="authority">
        <div>Authority Admin Panel</div>
      </RequireRole>
    );

    expect(screen.getByText('Authority Admin Panel')).toBeInTheDocument();
  });
});
