import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserProfile from '../../components/UserProfile';
import * as AuthContextModule from '../../context/AuthContext';

describe('UserProfile Component', () => {
  const mockUpdateProfile = vi.fn();
  const mockLogout = vi.fn();

  const mockUser = {
    _id: 'user-123',
    name: 'Omkar Bhure',
    email: 'omkar@example.com',
    role: 'citizen' as const,
    phone: '+91 9876543210',
    address: '42 MG Road, Bengaluru',
    avatar: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'fake-jwt-token',
      login: vi.fn(),
      register: vi.fn(),
      updateProfile: mockUpdateProfile,
      logout: mockLogout,
      loading: false,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UserProfile />
      </BrowserRouter>
    );
  };

  it('renders all user profile details, inputs, and action buttons', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /my profile & account settings/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Omkar Bhure')).toBeInTheDocument();
    expect(screen.getByDisplayValue('omkar@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+91 9876543210')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42 MG Road, Bengaluru')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('calls updateProfile with updated phone, address, and name on form submission', async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      ...mockUser,
      name: 'Omkar B.',
      phone: '+91 9999900000',
      address: '77 Brigade Road, Bengaluru',
    });

    renderComponent();

    fireEvent.change(screen.getByDisplayValue('Omkar Bhure'), {
      target: { value: 'Omkar B.' },
    });
    fireEvent.change(screen.getByDisplayValue('+91 9876543210'), {
      target: { value: '+91 9999900000' },
    });
    fireEvent.change(screen.getByDisplayValue('42 MG Road, Bengaluru'), {
      target: { value: '77 Brigade Road, Bengaluru' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save profile changes/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: 'Omkar B.',
        phone: '+91 9999900000',
        address: '77 Brigade Road, Bengaluru',
        avatar: '',
      });
      expect(screen.getByText(/profile details and photo updated successfully/i)).toBeInTheDocument();
    });
  });

  it('calls logout when the logout button is clicked on the profile page', () => {
    renderComponent();

    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

