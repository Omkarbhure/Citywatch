import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Map as MapIcon,
  PlusCircle,
  ThumbsUp,
  Calendar,
  Zap,
  Tag,
  Radio,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import useIncidents from '../hooks/useIncidents';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import { Incident } from '../types/incident';

const IncidentFeed: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [upvoteStatus, setUpvoteStatus] = useState<Record<string, string>>({});
  const [liveBanner, setLiveBanner] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();
  const { getIncidents, upvoteIncident, deleteIncident, loading, error } = useIncidents();

  const fetchFeed = async () => {
    try {
      const data = await getIncidents();
      setIncidents(data.incidents);
    } catch (err) {
      // Handled in hook
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [getIncidents]);

  // Acquire user location for geo-room subscription
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Could not determine geolocation for area subscription:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Socket.IO area subscription and event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (userCoords) {
      socket.emit('subscribe:area', userCoords);
    }

    const handleNewIncident = (newIncident: Incident) => {
      setIncidents((prev) => {
        if (prev.some((inc) => inc._id === newIncident._id)) return prev;
        return [newIncident, ...prev];
      });
      setLiveBanner(`⚡ New incident reported nearby: "${newIncident.title}"`);
      setTimeout(() => setLiveBanner(null), 5000);
    };

    const handleUpdatedIncident = (updatedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === updatedIncident._id ? updatedIncident : inc))
      );
      setLiveBanner(`Incident status updated: "${updatedIncident.title}" is now ${updatedIncident.status.toUpperCase()}`);
      setTimeout(() => setLiveBanner(null), 5000);
    };

    const handleDeletedIncident = ({ incidentId }: { incidentId: string }) => {
      setIncidents((prev) => prev.filter((inc) => inc._id !== incidentId));
      setLiveBanner(`Incident was removed by authority`);
      setTimeout(() => setLiveBanner(null), 5000);
    };

    const handleUpvotedIncident = ({ incidentId, upvoteCount }: { incidentId: string; upvoteCount: number }) => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc._id === incidentId) {
            const dummyArray = Array.from({ length: upvoteCount }, (_, i) => inc.upvotes[i] || `user-${i}`);
            return { ...inc, upvotes: dummyArray };
          }
          return inc;
        })
      );
    };

    socket.on('incident:new', handleNewIncident);
    socket.on('incident:updated', handleUpdatedIncident);
    socket.on('incident:deleted', handleDeletedIncident);
    socket.on('incident:upvoted', handleUpvotedIncident);

    return () => {
      if (userCoords) {
        socket.emit('unsubscribe:area', userCoords);
      }
      socket.off('incident:new', handleNewIncident);
      socket.off('incident:updated', handleUpdatedIncident);
      socket.off('incident:deleted', handleDeletedIncident);
      socket.off('incident:upvoted', handleUpvotedIncident);
    };
  }, [userCoords]);

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove the incident "${title}" from the system?`)) {
      try {
        await deleteIncident(id);
        setIncidents((prev) => prev.filter((inc) => inc._id !== id));
      } catch (err: any) {
        alert(err.message || 'Failed to delete incident');
      }
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      const res = await upvoteIncident(id);
      const currentUserId = user?._id || 'current-user';
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc._id !== id) return inc;
          const currentUpvotes = inc.upvotes || [];
          if (res.upvoted) {
            const alreadyIn = currentUpvotes.includes(currentUserId);
            return { ...inc, upvotes: alreadyIn ? currentUpvotes : [...currentUpvotes, currentUserId] };
          } else {
            return { ...inc, upvotes: currentUpvotes.filter((uid) => uid !== currentUserId) };
          }
        })
      );
      setUpvoteStatus((prev) => ({
        ...prev,
        [id]: res.upvoted ? `Upvoted (${res.upvotesCount})` : `Unvoted (${res.upvotesCount})`
      }));
    } catch (err: any) {
      setUpvoteStatus((prev) => ({ ...prev, [id]: err.message || 'Action failed' }));
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'resolved': return 'badge-resolved';
      case 'in_progress': return 'badge-in_progress';
      case 'acknowledged': return 'badge-acknowledged';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-pending';
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Citizen Incident Feed
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Real-time civic alerts and community upvoting
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/map" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapIcon size={16} /> Live Map
          </Link>
          <Link to="/report" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={16} /> Report Incident
          </Link>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Dashboard
          </Link>
        </div>
      </div>

      {liveBanner && (
        <div
          style={{
            backgroundColor: 'var(--color-info-bg)',
            border: '1px solid rgba(72, 128, 255, 0.3)',
            color: 'var(--color-info-text)',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Radio size={16} /> {liveBanner}
        </div>
      )}

      {loading && incidents.length === 0 && (
        <div className="dash-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>Loading incidents...</p>
        </div>
      )}
      {error && (
        <div
          style={{
            backgroundColor: 'var(--color-critical-bg)',
            color: 'var(--color-critical-text)',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {incidents.length === 0 && !loading && (
        <div className="dash-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ color: '#00B69B', display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <CheckCircle2 size={40} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>No Incidents Reported Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px' }}>
            Your neighborhood is clear! Be the first to <Link to="/report" style={{ color: 'var(--primary)', fontWeight: 700 }}>report an issue</Link>.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {incidents.map((incident) => (
          <div
            key={incident._id}
            className="dash-card dash-card-hover"
            style={{ padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {incident.title}
                </h3>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                  {incident.description}
                </p>
              </div>
              <span className={`badge-pill ${getStatusBadgeClass(incident.status)}`}>
                {incident.status.replace('_', ' ')}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Tag size={14} /> <strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{incident.category}</span>
              </span>
              {incident.address && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={14} /> {incident.address}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} /> {new Date(incident.createdAt).toLocaleDateString()}
              </span>
            </div>

            {(() => {
              const isUpvoted = Boolean(user && incident.upvotes?.includes(user._id));
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                  <button
                    onClick={() => handleUpvote(incident._id)}
                    className={isUpvoted ? 'btn-primary' : 'btn-secondary'}
                    style={{
                      padding: '7px 14px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: isUpvoted ? 'var(--primary)' : 'var(--bg-card)',
                      color: isUpvoted ? '#FFFFFF' : 'var(--text-main)',
                      borderColor: isUpvoted ? 'var(--primary)' : 'var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title={isUpvoted ? 'Click again to unvote' : 'Click to upvote'}
                  >
                    <ThumbsUp size={14} fill={isUpvoted ? '#FFFFFF' : 'none'} />
                    {isUpvoted ? 'Upvoted' : 'Upvote'} ({incident.upvotes?.length || 0})
                  </button>
                  {upvoteStatus[incident._id] && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {upvoteStatus[incident._id]}
                    </span>
                  )}

                  {user?.role === 'authority' && (
                    <button
                      onClick={() => handleDelete(incident._id, incident.title)}
                      style={{
                        marginLeft: 'auto',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--color-critical-bg)',
                        color: 'var(--color-critical-text)',
                        border: 'none',
                        borderRadius: 'var(--radius-input)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Remove incident permanently (Authority Only)"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncidentFeed;
