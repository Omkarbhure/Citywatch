import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import ForgotPassword from '../../components/ForgotPassword';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ForgotPassword />
      </BrowserRouter>
    );
  };

  it('renders Step 1 with email input and Send OTP button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send verification otp/i })).toBeInTheDocument();
  });

  it('displays error message when OTP request fails with 404', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'No account registered with this email address' } },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/name@example\.com/i), {
      target: { value: 'unknown@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send verification otp/i }));

    await waitFor(() => {
      expect(screen.getByText(/no account registered with this email address/i)).toBeInTheDocument();
    });
  });

  it('advances to Step 2 upon successful OTP request and reveals dummy OTP hint', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { message: 'OTP sent successfully', dummyOtp: '123456' },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/name@example\.com/i), {
      target: { value: 'citizen@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send verification otp/i }));

    await waitFor(() => {
      expect(screen.getByText(/dummy otp:/i)).toBeInTheDocument();
      expect(screen.getByText(/123456/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset & save password/i })).toBeInTheDocument();
    });
  });

  it('shows error if passwords do not match in Step 2', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { message: 'OTP sent successfully', dummyOtp: '123456' },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/name@example\.com/i), {
      target: { value: 'citizen@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification otp/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/re-type new password/i), {
      target: { value: 'PasswordMismatched!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /reset & save password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Only step 1 axios call, reset blocked
  });

  it('successfully resets password and navigates to Step 3 confirmation', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { message: 'OTP sent successfully', dummyOtp: '123456' },
      })
      .mockResolvedValueOnce({
        data: { message: 'Password reset successful. You can now log in with your new password.' },
      });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/name@example\.com/i), {
      target: { value: 'citizen@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send verification otp/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/at least 6 characters/i), {
      target: { value: 'BrandNewSecurePassword123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/re-type new password/i), {
      target: { value: 'BrandNewSecurePassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /reset & save password/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /password changed!/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed to login/i })).toBeInTheDocument();
    });
  });
});
