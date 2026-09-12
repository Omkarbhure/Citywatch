import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  MapPin,
  AlertOctagon,
  Clock,
  ShieldAlert,
  Layers,
  Map as MapIcon,
  Calendar,
  AlertTriangle,
  Tag,
  Zap
} from 'lucide-react';

import useAnalytics from '../hooks/useAnalytics';
import { AnalyticsData, AnalyticsParams } from '../types/analytics';

const CATEGORY_COLORS: Record<string, string> = {
  pothole: '#e65100',
  streetlight: '#f57f17',
  garbage: '#546e7a',
  flooding: '#0288d1',
  safety: '#d32f2f',
  other: '#7b1fa2'
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#6c757d',
  acknowledged: '#17a2b8',
  in_progress: '#ffc107',
  resolved: '#28a745',
  rejected: '#dc3545'
};

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getAnalytics, loading, error } = useAnalytics();

  const [data, setData] = useState<AnalyticsData | null>(null);

  // Date range inputs (default: last 30 days)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [slaHours, setSlaHours] = useState(72);

  const fetchMetrics = useCallback(async () => {
    try {
      const params: AnalyticsParams = {
        from: new Date(fromDate).toISOString(),
        to: new Date(`${toDate}T23:59:59.999Z`).toISOString(),
        slaHours
      };
      const res = await getAnalytics(params);
      setData(res);
    } catch (err) {
      // Handled in hook
    }
  }, [getAnalytics, fromDate, toDate, slaHours]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Authority Navigation & Tabs */}
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
            <BarChart3 size={28} color="var(--primary)" /> Response Performance &amp; City Analytics
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
            Aggregated metrics, resolution SLA trends, and geographic incident hotspots
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/authority" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={15} /> Triage Queue
          </Link>
          <Link to="/map" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapIcon size={15} /> Live Map
          </Link>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px' }}>
            Dashboard
          </Link>
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      <div
        className="dash-card"
        style={{
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> From:
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="dash-input"
            style={{ padding: '8px 12px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> To:
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="dash-input"
            style={{ padding: '8px 12px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> SLA Target (Hours):
          </label>
          <input
            type="number"
            min={1}
            max={720}
            value={slaHours}
            onChange={(e) => setSlaHours(Number(e.target.value))}
            className="dash-input"
            style={{ width: '90px', padding: '8px 12px' }}
          />
        </div>

        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="btn-primary"
          style={{
            padding: '9px 20px',
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Refreshing...' : 'Apply Filter'}
        </button>
      </div>

      {error && (
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
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          <div className="dash-card" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} /> Total Incidents
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
              {data.summary.totalIncidents}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Reported within selected range
            </div>
          </div>

          <div className="dash-card" style={{ borderLeft: '4px solid #00B69B', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Avg Resolution Time
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#00B69B', marginTop: '8px' }}>
              {data.summary.avgResolutionHours > 24
                ? `${(data.summary.avgResolutionHours / 24).toFixed(1)} days`
                : `${data.summary.avgResolutionHours} hrs`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              From citizen report to resolved
            </div>
          </div>

          <div className="dash-card" style={{ borderLeft: '4px solid #EB5757', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={14} /> SLA Breaches ({data.summary.slaThresholdHours}h+)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: data.summary.slaBreachCount > 0 ? '#EB5757' : '#00B69B', marginTop: '8px' }}>
              {data.summary.slaBreachCount}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Unresolved incidents exceeding SLA
            </div>
          </div>
        </div>
      )}

      {/* Primary Visualizations */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Daily Trend Line Chart */}
          <div className="dash-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" /> Incident Inflow Trend
            </h3>
            {data.timeline.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>No daily incident records in this range.</p>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={data.timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F2F6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Line type="monotone" dataKey="count" stroke="#4880FF" strokeWidth={3} dot={{ r: 3, fill: '#4880FF' }} name="Incidents" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category Breakdown Bar Chart */}
          <div className="dash-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} color="var(--primary)" /> Incidents by Category
            </h3>
            {data.categories.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>No category data in this range.</p>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={data.categories} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F2F6" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                    <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]}>
                      {data.categories.map((entry) => (
                        <Cell key={`cell-${entry.category}`} fill={CATEGORY_COLORS[entry.category] || '#4880FF'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Visualizations & Status Distribution */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Status Breakdown Pie Chart */}
          <div className="dash-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--primary)" /> Status Distribution
            </h3>
            {data.statuses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>No status data in this range.</p>
            ) : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <RechartsPie>
                    <Pie
                      data={data.statuses}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ status, count }) => `${status}: ${count}`}
                    >
                      {data.statuses.map((entry, idx) => (
                        <Cell key={`cell-status-${entry.status}`} fill={STATUS_COLORS[entry.status] || PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Hotspots Table */}
          <div className="dash-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="var(--primary)" /> Top Incident Hotspot Areas
            </h3>
            {data.hotspots.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>No hotspot clusters found in this range.</p>
            ) : (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 12px' }}>Area / Location</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Incidents</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hotspots.map((hotspot, idx) => (
                      <tr key={`hotspot-${idx}`}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{hotspot.address || `Lat ${hotspot.lat.toFixed(3)}, Lng ${hotspot.lng.toFixed(3)}`}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{hotspot.count}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/map?lat=${hotspot.lat}&lng=${hotspot.lng}`)}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <MapIcon size={12} /> View on Map
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SLA Breaches Action Table */}
      {data && data.slaBreaches.length > 0 && (
        <div className="dash-card" style={{ borderTop: '3px solid #EB5757' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#EB5757', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={18} /> Active SLA Breaches (Unresolved &gt; {data.summary.slaThresholdHours} Hours)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 14px' }}>Title</th>
                  <th style={{ padding: '12px 14px' }}>Category</th>
                  <th style={{ padding: '12px 14px' }}>Priority</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Age (Hours Open)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.slaBreaches.map((item) => (
                  <tr key={item._id}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{item.title}</td>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize' }}>{item.category}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge-pill badge-${item.priority}`}>{item.priority}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`badge-pill badge-${item.status}`}>{item.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#EB5757', fontWeight: 800 }}>{item.hoursOpen} hrs</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <Link
                        to="/authority"
                        className="badge-pill badge-critical"
                        style={{ padding: '6px 12px', textDecoration: 'none', fontSize: '12px', fontWeight: 700 }}
                      >
                        Triage in Queue
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
