import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Map as MapIcon,
  ListFilter,
  PlusCircle,
  ShieldAlert,
  Bell,
  BellRing,
  Activity,
  Info
} from 'lucide-react';
import {
  isPushSupported,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush
} from '../lib/push';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState('');

  useEffect(() => {
    const checkSubscription = async () => {
      if (isPushSupported()) {
        const sub = await getCurrentPushSubscription();
        setPushEnabled(!!sub);
      }
    };
    checkSubscription();
  }, []);

  const handleTogglePush = async () => {
    if (!isPushSupported()) {
      setPushMessage('Web Push is not supported on this browser.');
      return;
    }

    setPushLoading(true);
    setPushMessage('');

    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        setPushMessage('Push notifications disabled.');
      } else {
        const sub = await subscribeToPush();
        if (sub) {
          setPushEnabled(true);
          setPushMessage('Push notifications enabled successfully!');
        } else {
          setPushMessage('Permission denied or dismissed.');
        }
      }
    } catch (err: any) {
      setPushMessage(err.message || 'Failed to update notification settings');
    } finally {
      setPushLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div
        className="dash-card"
        style={{
          background: 'linear-gradient(135deg, #4880FF 0%, #605BFF 100%)',
          color: '#FFFFFF',
          marginBottom: '28px',
          border: 'none',
          padding: '32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} /> CIVIC COMMAND CENTER
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Welcome back, {user.name}!
            </h1>
            <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
              Active account: <strong style={{ color: '#FFFFFF' }}>{user.email}</strong> • Role:{' '}
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'capitalize' }}>
                {user.role}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate('/report')}
            style={{
              backgroundColor: '#FFFFFF',
              color: 'var(--primary)',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MapPin size={18} strokeWidth={2.5} /> Report New Incident
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>
        QUICK ACTIONS
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          className="dash-card dash-card-hover"
          onClick={() => navigate('/map')}
          style={{ cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'var(--color-info-bg)',
              color: 'var(--color-info-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapIcon size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>Live Geo-Map</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Explore real-time map pins</div>
          </div>
        </div>

        <div
          className="dash-card dash-card-hover"
          onClick={() => navigate('/incidents')}
          style={{ cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'var(--color-medium-bg)',
              color: 'var(--color-medium-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ListFilter size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>Incident Feed</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Browse & upvote civic reports</div>
          </div>
        </div>

        <div
          className="dash-card dash-card-hover"
          onClick={() => navigate('/report')}
          style={{ cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: 'var(--color-low-bg)',
              color: 'var(--color-low-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlusCircle size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>Report Issue</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Capture GPS & submit issue</div>
          </div>
        </div>

        {user.role === 'authority' && (
          <div
            className="dash-card dash-card-hover"
            onClick={() => navigate('/authority')}
            style={{ cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid #8854D0' }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: '#F3E8FF',
                color: '#8854D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={26} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#8854D0' }}>Authority Queue</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Triage & claim tickets</div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings Panel */}
      <div className="dash-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                {pushEnabled ? <BellRing size={22} strokeWidth={2.2} /> : <Bell size={22} strokeWidth={2.2} />}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Web Push Notifications</h3>
              <span className={`badge-pill ${pushEnabled ? 'badge-low' : 'badge-pending'}`}>
                {pushEnabled ? 'Active (ON)' : 'Disabled (OFF)'}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '650px' }}>
              Receive instant background notifications when civic issues you reported or upvoted change status.
            </p>
          </div>

          <button
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={pushEnabled ? 'btn-secondary' : 'btn-primary'}
            style={{ minWidth: '130px' }}
          >
            {pushLoading ? 'Updating...' : pushEnabled ? 'Turn Off' : 'Enable Push'}
          </button>
        </div>

        {pushMessage && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: 'var(--color-info-bg)',
              color: 'var(--color-info-text)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Info size={16} /> {pushMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;