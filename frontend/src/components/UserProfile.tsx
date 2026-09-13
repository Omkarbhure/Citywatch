import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Camera,
  Trash2,
  Save,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw
} from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Selected image exceeds 2MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatar('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({
        name,
        phone,
        address,
        avatar,
      });
      setSuccessMsg('Profile details and photo updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };


  const isAuthority = user?.role === 'authority';

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          My Profile &amp; Account Settings
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage your personal details, contact information, profile photo, and security settings
        </p>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div
          style={{
            backgroundColor: '#E8F5E9',
            color: '#2E7D32',
            padding: '14px 18px',
            borderRadius: 'var(--radius-input)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1)',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'var(--color-critical-bg, #FFECEC)',
            color: 'var(--color-critical-text, #D32F2F)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-input)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div
        className="dash-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-color)',
          padding: '32px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Profile Avatar Header Section */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            paddingBottom: '28px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Avatar Preview */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  backgroundColor: isAuthority ? '#8854D0' : 'var(--primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 800,
                  overflow: 'hidden',
                  border: '3px solid #FFFFFF',
                  boxShadow: '0 4px 16px rgba(72, 128, 255, 0.25)',
                }}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name || 'User Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  name ? name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
            </div>

            {/* User Meta Information */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {name || 'Citizen User'}
                </h2>
                <span
                  className={`badge-pill ${isAuthority ? 'badge-acknowledged' : 'badge-pending'}`}
                  style={{ fontSize: '11px', textTransform: 'capitalize' }}
                >
                  <ShieldCheck size={12} style={{ marginRight: '4px' }} />
                  {user?.role || 'Citizen'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Avatar Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
              id="avatar-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                fontSize: '13px',
              }}
            >
              <Camera size={16} />
              <span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
            </button>

            {avatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-critical-bg)',
                  color: 'var(--color-critical-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-input)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Full Name */}
            <div>
              <label
                htmlFor="profile-name"
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}
              >
                Full Name:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="dash-input"
                  placeholder="e.g. Omkar Bhure"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                <UserIcon
                  size={16}
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

            {/* Email (Verified / Read-Only) */}
            <div>
              <label
                htmlFor="profile-email"
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}
              >
                Email Address:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="dash-input"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    backgroundColor: '#F8FAFC',
                    cursor: 'not-allowed',
                    color: 'var(--text-muted)',
                  }}
                />
                <Mail
                  size={16}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Phone Number */}
            <div>
              <label
                htmlFor="profile-phone"
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}
              >
                Phone Number:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="dash-input"
                  placeholder="e.g. +91 9876543210"
                  style={{ width: '100%', paddingLeft: '38px' }}
                />
                <Phone
                  size={16}
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

            {/* Role & Permissions Badge */}
            <div>
              <label
                style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}
              >
                Platform Access Level:
              </label>
              <div
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-input)',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={16} color={isAuthority ? '#8854D0' : 'var(--primary)'} />
                <span style={{ textTransform: 'capitalize' }}>{user?.role || 'Citizen'} User</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {isAuthority ? 'Triage & Resolution Access' : 'Reporting & Community Access'}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div style={{ marginBottom: '28px' }}>
            <label
              htmlFor="profile-address"
              style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}
            >
              Physical / Residential Address:
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                id="profile-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="dash-input"
                placeholder="e.g. 42 MG Road, Indiranagar, Bengaluru, Karnataka 560038"
                style={{ width: '100%', paddingLeft: '38px', resize: 'vertical' }}
              />
              <MapPin
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '14px',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          {/* Save Profile Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Security Section */}
      <div
        className="dash-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-color)',
          padding: '24px 32px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
            Account Security &amp; Password
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Need to update or reset your account password?
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/forgot-password"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-input)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <KeyRound size={15} />
            <span>Reset Password</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-input)',
              border: 'none',
              backgroundColor: 'var(--color-critical-bg)',
              color: 'var(--color-critical-text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
