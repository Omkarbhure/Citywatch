import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Map as MapIcon,
  Mountain,
  Home,
  CheckCircle2,
  Navigation,
  Bell,
  Check,
  AlertTriangle,
  Radio
} from 'lucide-react';
import useIncidents from '../hooks/useIncidents';
import { IncidentCategory } from '../types/incident';
import { isPushSupported, subscribeToPush } from '../lib/push';

const IncidentForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('pothole');
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const { createIncident, loading } = useIncidents();
  const navigate = useNavigate();

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    setGeoMessage('Acquiring GPS location & altitude...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        const alt = position.coords.altitude;

        setCoordinates([lng, lat]);
        setAltitude(alt !== null && alt !== undefined ? alt : null);
        setGeoMessage(`Location acquired: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
        setGeoLoading(false);

        // Reverse geocoding to resolve street address (non-blocking)
        if (typeof fetch !== 'undefined') {
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.display_name) {
                setDetectedAddress(data.display_name);
                setAddress((prev) => (prev ? prev : data.display_name));
              }
            })
            .catch(() => {
              // Ignore network errors in test or offline
            });
        }
      },
      (err) => {
        setGeoMessage(`Failed to get location: ${err.message}`);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEnablePush = async () => {
    await subscribeToPush();
    setShowPushPrompt(false);
    navigate('/incidents');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!coordinates) {
      setFormError('Please acquire your location coordinates before submitting.');
      return;
    }

    try {
      await createIncident({
        title,
        description,
        category,
        coordinates,
        address: address || undefined,
        media: []
      });

      setSuccessMessage('Incident reported successfully!');

      if (isPushSupported() && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        setShowPushPrompt(true);
      } else {
        setTimeout(() => {
          navigate('/incidents');
        }, 1500);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit incident');
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Report New Incident
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Submit civic defects directly to municipal dispatch
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/map" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapIcon size={16} /> Live Map
          </Link>
          <Link to="/incidents" className="btn-secondary" style={{ textDecoration: 'none' }}>
            View Feed
          </Link>
        </div>
      </div>

      {successMessage && (
        <div
          style={{
            backgroundColor: 'var(--color-low-bg)',
            color: 'var(--color-low-text)',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={18} strokeWidth={2.5} /> {successMessage}
        </div>
      )}

      {formError && (
        <div
          style={{
            backgroundColor: 'var(--color-critical-bg)',
            color: 'var(--color-critical-text)',
            padding: '14px 18px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} /> {formError}
        </div>
      )}

      {showPushPrompt && (
        <div
          style={{
            backgroundColor: 'var(--color-info-bg)',
            border: '1px solid rgba(72, 128, 255, 0.3)',
            padding: '18px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-info-text)', fontWeight: 600 }}>
            <strong>Want to know when this gets resolved?</strong><br />
            Enable notifications to receive instant updates when the status changes.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleEnablePush}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Bell size={16} /> Enable Notifications
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPushPrompt(false);
                navigate('/incidents');
              }}
              className="btn-secondary"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <div className="dash-card">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>
              Title:
            </label>
            <input
              type="text"
              className="dash-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken streetlight on Elm St."
              required
              maxLength={120}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>
              Category:
            </label>
            <select
              className="dash-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as IncidentCategory)}
            >
              <option value="pothole">Pothole</option>
              <option value="streetlight">Streetlight</option>
              <option value="garbage">Garbage</option>
              <option value="flooding">Flooding</option>
              <option value="safety">Safety</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>
              Description:
            </label>
            <textarea
              className="dash-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              required
              maxLength={1000}
              rows={4}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 700 }}>
              Address (Optional):
            </label>
            <input
              type="text"
              className="dash-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>

          <div
            style={{
              marginBottom: '24px',
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-color)',
              padding: '20px',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                Location Coordinates:
              </label>
              {coordinates && (
                <span className="badge-pill badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> GPS Fixed: [{coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}]
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={geoLoading}
                className="btn-primary"
                style={{
                  backgroundColor: coordinates ? '#00B69B' : 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Navigation size={16} />
                {geoLoading ? 'Acquiring GPS...' : coordinates ? '✓ Location Set' : '📍 Use My Current Location'}
              </button>
            </div>

            {coordinates && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  border: '1px solid var(--border-color)',
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                  <div style={{ color: 'var(--primary)', display: 'flex' }}>
                    <MapPin size={16} />
                  </div>
                  <span><strong>Coordinates:</strong> Lat {coordinates[1].toFixed(4)}, Lng {coordinates[0].toFixed(4)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                  <div style={{ color: '#8854D0', display: 'flex' }}>
                    <Mountain size={16} />
                  </div>
                  <span>
                    <strong>Altitude:</strong>{' '}
                    {altitude !== null ? (
                      <strong style={{ color: 'var(--primary)' }}>{altitude.toFixed(1)} m above sea level</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Elevation ~540m (Ground level / sensor standard)</span>
                    )}
                  </span>
                </div>

                {detectedAddress && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'var(--text-main)' }}>
                    <div style={{ color: '#00B69B', display: 'flex', marginTop: '2px' }}>
                      <Home size={16} />
                    </div>
                    <span>
                      <strong>Detected Address:</strong>{' '}
                      <span style={{ color: '#00B69B', fontWeight: 600 }}>{detectedAddress}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {geoMessage && (
              <p style={{ fontSize: '13px', marginTop: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {geoMessage}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !coordinates}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 800,
            }}
          >
            {loading ? 'Submitting...' : 'Submit Incident Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IncidentForm;
