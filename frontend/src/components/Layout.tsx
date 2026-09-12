import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListFilter,
  Map as MapIcon,
  PlusCircle,
  ShieldAlert,
  BarChart3,
  LogOut,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isAuthority = user?.role === 'authority';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
    { label: 'Incidents Feed', path: '/incidents', Icon: ListFilter },
    { label: 'Live Geo-Map', path: '/map', Icon: MapIcon },
    { label: 'Report Incident', path: '/report', Icon: PlusCircle },
  ];

  const authorityItems = [
    { label: 'Triage Queue', path: '/authority', Icon: ShieldAlert },
    { label: 'Analytics & SLA', path: '/authority/analytics', Icon: BarChart3 },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      {/* DashStack Left Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '260px' : '80px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 100,
          transition: 'width 0.2s ease',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(72, 128, 255, 0.3)',
              flexShrink: 0
            }}
          >
            CW
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                City<span style={{ color: 'var(--primary)' }}>Watch</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CIVIC PLATFORM</div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div style={{ padding: '20px 12px', flex: 1, overflowY: 'auto' }}>
          {sidebarOpen && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '0 12px 10px', letterSpacing: '0.5px' }}>
              MAIN MENU
            </div>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const ItemIcon = item.Icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  marginBottom: '4px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#FFFFFF' : 'var(--text-main)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(72, 128, 255, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                }}
              >
                <ItemIcon size={18} strokeWidth={2.2} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}

          {isAuthority && (
            <>
              {sidebarOpen && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '24px 12px 10px', letterSpacing: '0.5px' }}>
                  AUTHORITY PORTAL
                </div>
              )}
              {authorityItems.map((item) => {
                const isActive = location.pathname === item.path;
                const ItemIcon = item.Icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 16px',
                      borderRadius: '10px',
                      marginBottom: '4px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#FFFFFF' : 'var(--text-main)',
                      backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                      boxShadow: isActive ? '0 4px 14px rgba(72, 128, 255, 0.3)' : 'none',
                      transition: 'all 0.15s ease',
                      justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    }}
                  >
                    <ItemIcon size={18} strokeWidth={2.2} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-critical-bg)',
              color: 'var(--color-critical-text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
            }}
          >
            <LogOut size={16} strokeWidth={2.2} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* DashStack Top Header */}
        <header
          style={{
            height: '70px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          {/* Left Title / Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: '6px'
              }}
            >
              <Menu size={20} strokeWidth={2.2} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Real-Time Civic Incident Platform</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00B69B', display: 'inline-block' }} />
            </div>
          </div>

          {/* Right User & Role Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '6px 14px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isAuthority ? '#8854D0' : 'var(--primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    {user.name}
                  </div>
                  <span
                    className={`badge-pill ${isAuthority ? 'badge-acknowledged' : 'badge-pending'}`}
                    style={{ fontSize: '10px', padding: '1px 8px' }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Container */}
        <main style={{ padding: '32px', flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
