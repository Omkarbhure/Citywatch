import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  BarChart3,
  Map as MapIcon,
  ListFilter,
  MapPin,
  ThumbsUp,
  AlertTriangle,
  Radio,
  UserCheck,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useIncidentQueue, { QueueFilters } from '../hooks/useIncidentQueue';
import useIncidents from '../hooks/useIncidents';
import { getSocket } from '../lib/socket';
import {
  Incident,
  IncidentCategory,
  IncidentStatus,
  IncidentPriority
} from '../types/incident';

const PRIORITY_COLORS: Record<IncidentPriority, { bg: string; text: string }> = {
  critical: { bg: '#dc3545', text: '#ffffff' },
  high: { bg: '#fd7e14', text: '#ffffff' },
  medium: { bg: '#ffc107', text: '#212529' },
  low: { bg: '#28a745', text: '#ffffff' }
};

const STATUS_COLORS: Record<IncidentStatus, { bg: string; text: string }> = {
  pending: { bg: '#6c757d', text: '#ffffff' },
  acknowledged: { bg: '#17a2b8', text: '#ffffff' },
  in_progress: { bg: '#ffc107', text: '#212529' },
  resolved: { bg: '#28a745', text: '#ffffff' },
  rejected: { bg: '#dc3545', text: '#ffffff' }
};

export const AuthorityDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    getQueue,
    assignIncident,
    unassignIncident,
    updateStatus,
    updatePriority,
    loading,
    error
  } = useIncidentQueue();
  const { deleteIncident } = useIncidents();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [liveBanner, setLiveBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently remove "${title}"?`)) {
      try {
        await deleteIncident(id);
        setIncidents((prev) => prev.filter((inc) => inc._id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        setActionError(err.message || 'Failed to remove incident');
      }
    }
  };

  // Filters state
  const [filters, setFilters] = useState<QueueFilters>({
    status: 'active',
    category: 'all',
    priority: 'all',
    assignedTo: 'all',
    sortBy: 'priority',
    page: 1,
    limit: 25
  });

  const fetchQueue = useCallback(async () => {
    try {
      const data = await getQueue(filters);
      setIncidents(data.incidents);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      // Handled in hook
    }
  }, [getQueue, filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Real-time Socket.IO subscription for broad authority updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewIncident = (newInc: Incident) => {
      setLiveBanner(`🚨 New incoming incident: "${newInc.title}"`);
      setTimeout(() => setLiveBanner(null), 5000);
      fetchQueue();
    };

    const handleUpdatedIncident = (updatedInc: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === updatedInc._id ? { ...inc, ...updatedInc } : inc))
      );
      setLiveBanner(`Incident updated: "${updatedInc.title}"`);
      setTimeout(() => setLiveBanner(null), 4000);
    };

    const handleAssignedIncident = (assignedInc: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === assignedInc._id ? { ...inc, ...assignedInc } : inc))
      );
    };

    const handleUnassignedIncident = (unassignedInc: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === unassignedInc._id ? { ...inc, ...unassignedInc } : inc))
      );
    };

    socket.on('incident:new', handleNewIncident);
    socket.on('incident:updated', handleUpdatedIncident);
    socket.on('incident:assigned', handleAssignedIncident);
    socket.on('incident:unassigned', handleUnassignedIncident);

    return () => {
      socket.off('incident:new', handleNewIncident);
      socket.off('incident:updated', handleUpdatedIncident);
      socket.off('incident:assigned', handleAssignedIncident);
      socket.off('incident:unassigned', handleUnassignedIncident);
    };
  }, [fetchQueue]);

  const handleClaim = async (incidentId: string, force: boolean = false) => {
    setActionError(null);
    try {
      const updated = await assignIncident(incidentId, force);
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === incidentId ? { ...inc, ...updated } : inc))
      );
    } catch (err: any) {
      if (err.message?.includes('already assigned')) {
        const confirmForce = window.confirm(
          'This incident is already assigned to another authority. Do you want to force reassign it to yourself?'
        );
        if (confirmForce) {
          handleClaim(incidentId, true);
        }
      } else {
        setActionError(err.message || 'Failed to assign incident');
      }
    }
  };

  const handleUnclaim = async (incidentId: string) => {
    setActionError(null);
    try {
      const updated = await unassignIncident(incidentId);
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === incidentId ? { ...inc, ...updated } : inc))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to unassign incident');
    }
  };

  const handleStatusChange = async (incidentId: string, newStatus: IncidentStatus) => {
    setActionError(null);
    try {
      const updated = await updateStatus(incidentId, { status: newStatus });
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === incidentId ? { ...inc, ...updated } : inc))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (incidentId: string, newPriority: IncidentPriority) => {
    setActionError(null);
    try {
      const updated = await updatePriority(incidentId, { priority: newPriority });
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === incidentId ? { ...inc, ...updated } : inc))
      );
    } catch (err: any) {
      setActionError(err.message || 'Failed to update priority');
    }
  };

  const getAssignedName = (assignedTo?: any): string => {
    if (!assignedTo) return 'Unassigned';
    if (typeof assignedTo === 'object' && assignedTo.name) {
      return assignedTo._id === user?._id ? `${assignedTo.name} (You)` : assignedTo.name;
    }
    return 'Assigned';
  };

  const isAssignedToMe = (assignedTo?: any): boolean => {
    if (!assignedTo || !user) return false;
    const assignedId = typeof assignedTo === 'object' ? assignedTo._id : assignedTo;
    return assignedId === user._id;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header & Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={28} color="var(--primary)" /> Authority Triage Queue
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
            Logged in as <strong>{user?.name}</strong> (Authority Role) — <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{total} total actionable incident{total === 1 ? '' : 's'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/authority/analytics" className="btn-primary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={15} /> Analytics & SLA
          </Link>
          <Link to="/map" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapIcon size={15} /> Live Map
          </Link>
          <Link to="/incidents" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ListFilter size={15} /> Incident Feed
          </Link>
        </div>
      </div>

      {/* Live notification banner */}
      {liveBanner && (
        <div
          style={{
            backgroundColor: 'var(--color-info-bg)',
            border: '1px solid rgba(72, 128, 255, 0.3)',
            color: 'var(--color-info-text)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-card)',
            marginBottom: '20px',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(72, 128, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Radio size={16} /> {liveBanner}
        </div>
      )}

      {(error || actionError) && (
        <div
          style={{
            backgroundColor: 'var(--color-critical-bg)',
            border: '1px solid rgba(235, 87, 87, 0.3)',
            color: 'var(--color-critical-text)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-card)',
            marginBottom: '20px',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} /> {error || actionError}
        </div>
      )}

      {/* Filter & Sort Controls */}
      <div
        className="dash-card"
        style={{
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '16px',
          alignItems: 'end'
        }}
      >
        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
            className="dash-select"
            style={{ width: '100%', marginTop: '6px' }}
          >
            <option value="active">Active (Pending / In Progress)</option>
            <option value="all">All Statuses (inc. Resolved)</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Category:</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value as any, page: 1 }))}
            className="dash-select"
            style={{ width: '100%', marginTop: '6px' }}
          >
            <option value="all">All Categories</option>
            <option value="pothole">Pothole</option>
            <option value="streetlight">Streetlight</option>
            <option value="garbage">Garbage</option>
            <option value="flooding">Flooding</option>
            <option value="safety">Safety</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Priority:</label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value as any, page: 1 }))}
            className="dash-select"
            style={{ width: '100%', marginTop: '6px' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Assignment:</label>
          <select
            value={filters.assignedTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, assignedTo: e.target.value as any, page: 1 }))}
            className="dash-select"
            style={{ width: '100%', marginTop: '6px' }}
          >
            <option value="all">All Incidents</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned Only</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Sort By:</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any, page: 1 }))}
            className="dash-select"
            style={{ width: '100%', marginTop: '6px' }}
          >
            <option value="priority">Priority (Critical First)</option>
            <option value="upvotes">Upvotes (Most Popular)</option>
            <option value="oldest">Oldest First (Neglected)</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* Incident Queue Table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ padding: '16px 20px' }}>Priority</th>
                <th style={{ padding: '16px 20px' }}>Title & Location</th>
                <th style={{ padding: '16px 20px' }}>Category</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px', textAlign: 'center' }}>Upvotes</th>
                <th style={{ padding: '16px 20px' }}>Reporter</th>
                <th style={{ padding: '16px 20px' }}>Assigned To</th>
                <th style={{ padding: '16px 20px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading triage queue...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No incidents matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => {
                  const isClaimedByMe = isAssignedToMe(incident.assignedTo);
                  const hasAssignee = !!incident.assignedTo;

                  return (
                    <tr
                      key={incident._id}
                      style={{
                        backgroundColor: isClaimedByMe ? 'rgba(72, 128, 255, 0.04)' : undefined
                      }}
                    >
                      {/* Priority Selector */}
                      <td style={{ padding: '14px 20px' }}>
                        <select
                          value={incident.priority}
                          onChange={(e) => handlePriorityChange(incident._id, e.target.value as IncidentPriority)}
                          className={`badge-pill badge-${incident.priority}`}
                          style={{
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </td>

                      {/* Title & Address */}
                      <td style={{ padding: '14px 20px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '3px' }}>
                          {incident.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} style={{ flexShrink: 0 }} />
                          <span>{incident.address || 'Coordinates reported'}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-main)' }}>
                          {incident.category}
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td style={{ padding: '14px 20px' }}>
                        <select
                          value={incident.status}
                          onChange={(e) => handleStatusChange(incident._id, e.target.value as IncidentStatus)}
                          className={`badge-pill badge-${incident.status}`}
                          style={{
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            fontFamily: 'inherit'
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="acknowledged">Acknowledged</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>

                      {/* Upvotes */}
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ padding: '4px 8px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ThumbsUp size={12} /> {incident.upvotes?.length || 0}
                        </span>
                      </td>

                      {/* Reporter */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-main)', fontWeight: 500 }}>
                        {typeof incident.reporter === 'object' && incident.reporter ? incident.reporter.name : 'Citizen'}
                      </td>

                      {/* Assigned To */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: hasAssignee ? 700 : 500,
                            color: isClaimedByMe ? '#00B69B' : hasAssignee ? 'var(--primary)' : 'var(--text-muted)'
                          }}
                        >
                          {getAssignedName(incident.assignedTo)}
                        </span>
                      </td>

                      {/* Action Controls */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        {!hasAssignee ? (
                          <button
                            onClick={() => handleClaim(incident._id)}
                            className="btn-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px'
                            }}
                          >
                            Claim
                          </button>
                        ) : isClaimedByMe ? (
                          <button
                            onClick={() => handleUnclaim(incident._id)}
                            className="btn-secondary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px'
                            }}
                          >
                            Unassign
                          </button>
                        ) : (
                          <button
                            onClick={() => handleClaim(incident._id, true)}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: '#FF9F43',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 'var(--radius-input)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          >
                            Reassign
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(incident._id, incident.title)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: 'var(--color-critical-bg)',
                            color: 'var(--color-critical-text)',
                            border: 'none',
                            borderRadius: 'var(--radius-input)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            marginLeft: '6px'
                          }}
                          title="Permanently remove incident from system"
                        >
                          <Trash2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: '#FFFFFF'
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
            Page {filters.page || 1} of {totalPages || 1}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={(filters.page || 1) <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
              className="btn-secondary"
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                opacity: (filters.page || 1) <= 1 ? 0.5 : 1,
                cursor: (filters.page || 1) <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <button
              disabled={(filters.page || 1) >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
              className="btn-secondary"
              style={{
                padding: '6px 16px',
                fontSize: '13px',
                opacity: (filters.page || 1) >= totalPages ? 0.5 : 1,
                cursor: (filters.page || 1) >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
