import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dummyOtpHint, setDummyOtpHint] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      const receivedDummyOtp = response.data.dummyOtp || '123456';
      setDummyOtpHint(receivedDummyOtp);
      setOtp(receivedDummyOtp); // Pre-populate OTP for seamless testability
      setSuccessMsg(response.data.message || 'OTP sent successfully');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/reset-password', {
        email,
        otp,
        newPassword,
      });

      setSuccessMsg(response.data.message || 'Password reset successful!');
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-canvas)',
        padding: '24px',
      }}
    >
      <div
        className="dash-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px 32px',
          borderRadius: 'var(--radius-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Brand Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 8px 16px rgba(72, 128, 255, 0.3)',
              marginBottom: '16px',
            }}
          >
            CW
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>
            {step === 3 ? 'Password Changed!' : 'Reset Your Password'}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {step === 1 && 'Enter your registered email to receive a dummy verification OTP'}
            {step === 2 && 'Enter the 6-digit OTP code and choose your new password'}
            {step === 3 && 'Your credentials have been securely updated in the database'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-critical-bg, #FFECEC)',
              color: 'var(--color-critical-text, #D32F2F)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-input)',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Request OTP Form */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="forgot-email"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Registered Email Address:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="dash-input"
                  placeholder="name@example.com"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Send Verification OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP & Enter New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            {dummyOtpHint && (
              <div
                style={{
                  backgroundColor: '#E8F5E9',
                  color: '#2E7D32',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-input)',
                  marginBottom: '18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} />
                  <span>Dummy OTP: <strong>{dummyOtpHint}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(dummyOtpHint)}
                  style={{
                    background: '#2E7D32',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Auto-fill
                </button>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="otp-input"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                6-Digit OTP Code:
              </label>
              <input
                id="otp-input"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                required
                maxLength={8}
                className="dash-input"
                placeholder="123456"
                style={{
                  width: '100%',
                  letterSpacing: '3px',
                  fontWeight: 700,
                  fontSize: '16px',
                  textAlign: 'center',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="new-password-input"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                New Password:
              </label>
              <input
                id="new-password-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="dash-input"
                placeholder="At least 6 characters"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="confirm-password-input"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Confirm New Password:
              </label>
              <input
                id="confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="dash-input"
                placeholder="Re-type new password"
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Reset &amp; Save Password</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              style={{
                marginTop: '12px',
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={14} /> Back to Email Input
            </button>
          </form>
        )}

        {/* Step 3: Success State */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#E8F5E9',
                color: '#2E7D32',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
              Password Reset Complete!
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {successMsg || 'You can now log in using your new password.'}
            </p>

            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Proceed to Login
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Remembered your password?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
