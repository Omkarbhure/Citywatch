import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
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
        padding: '24px'
      }}
    >
      <div
        className="dash-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px 32px'
        }}
      >
        {/* Brand Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
              marginBottom: '16px'
            }}
          >
            CW
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>Sign Up for CityWatch</h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Join your community to report and monitor civic issues
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-critical-bg)',
              color: 'var(--color-critical-text)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-input)',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="dash-input"
              placeholder="Jane Doe"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="dash-input"
              placeholder="name@example.com"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="dash-input"
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
              Role:
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="dash-select"
              style={{ width: '100%' }}
            >
              <option value="citizen">Citizen</option>
              <option value="authority">Authority</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;