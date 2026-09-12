import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  PlusCircle,
  Search,
  Radio,
  AlertTriangle,
  ThumbsUp,
  Map as MapIcon
} from 'lucide-react';

import useIncidents from '../hooks/useIncidents';
import { getSocket } from '../lib/socket';
import { Incident, IncidentCategory } from '../types/incident';
import IncidentMapFilters from './IncidentMapFilters';

// Fix for default Leaflet icon paths in Vite bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Category Colors Palette
const CATEGORY_COLORS: Record<IncidentCategory, string> = {
  pothole: '#e65100', // Deep Orange
  streetlight: '#f57f17', // Amber
  garbage: '#546e7a', // Blue Grey
  flooding: '#0288d1', // Vibrant Blue
  safety: '#d32f2f', // Red
  other: '#7b1fa2' // Purple
};

// Helper to create colored DivIcons for clustered map markers
const createCategoryIcon = (category: IncidentCategory) => {
  const color = CATEGORY_COLORS[category] || '#333333';
  const html = `
    <div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-incident-marker',
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

// Geographic Center and Boundary Bounds for India
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];
const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.4627, 68.1097], // South-West (Indian Ocean / Gujarat coast)
  [37.0841, 97.3956]  // North-East (Kashmir / Arunachal Pradesh)
];

// Sub-component to monitor map pan/zoom changes and trigger "Search this area" prompt
interface MapControllerProps {
  onCenterChange: (center: [number, number]) => void;
}

const MapController: React.FC<MapControllerProps> = ({ onCenterChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange([center.lat, center.lng]);
    }
  });
  return null;
};

// Calculate approximate distance between two lat/lng points in meters
const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const IncidentMap: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [currentMapCenter, setCurrentMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [lastFetchedCenter, setLastFetchedCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [liveBanner, setLiveBanner] = useState<string | null>(null);

  // Filters State
  const [selectedCategories, setSelectedCategories] = useState<Set<IncidentCategory>>(
    new Set(['pothole', 'streetlight', 'garbage', 'flooding', 'safety', 'other'])
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  const [searchParams] = useSearchParams();
  const { getIncidents, loading, error } = useIncidents();

  // Fetch incidents for a given center coordinate
  const fetchIncidentsForCenter = useCallback(
    async (targetCenter: [number, number], radiusMeters: number = 10000) => {
      try {
        const [lat, lng] = targetCenter;
        const data = await getIncidents({
          near: `${lat},${lng}`,
          radius: radiusMeters,
          limit: 100
        });
        setIncidents(data.incidents);
        setLastFetchedCenter(targetCenter);
        setShowSearchArea(false);
      } catch (err) {
        // Handled in hook
      }
    },
    [getIncidents]
  );

  // Initialize with query params lat/lng or user geolocation
  useEffect(() => {
    const paramLat = searchParams.get('lat');
    const paramLng = searchParams.get('lng');

    if (paramLat && paramLng) {
      const lat = parseFloat(paramLat);
      const lng = parseFloat(paramLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const queryCenter: [number, number] = [lat, lng];
        setCenter(queryCenter);
        setCurrentMapCenter(queryCenter);
        fetchIncidentsForCenter(queryCenter);
        return;
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCenter: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCenter(userCenter);
          setCurrentMapCenter(userCenter);
          fetchIncidentsForCenter(userCenter);
        },
        (err) => {
          console.warn('Geolocation unavailable, using default center:', err.message);
          fetchIncidentsForCenter(DEFAULT_CENTER);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      fetchIncidentsForCenter(DEFAULT_CENTER);
    }
  }, [fetchIncidentsForCenter, searchParams]);

  // Monitor map movement threshold for "Search this area" button
  const handleCenterChange = (newCenter: [number, number]) => {
    setCurrentMapCenter(newCenter);
    const dist = getDistanceMeters(
      lastFetchedCenter[0],
      lastFetchedCenter[1],
      newCenter[0],
      newCenter[1]
    );
    // Show search button if panned more than 3km from last fetch center
    if (dist > 3000) {
      setShowSearchArea(true);
    } else {
      setShowSearchArea(false);
    }
  };

  // Socket.IO area subscription and live marker updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const [lat, lng] = lastFetchedCenter;
    socket.emit('subscribe:area', { lat, lng });

    const handleNewIncident = (newIncident: Incident) => {
      setIncidents((prev) => {
        if (prev.some((inc) => inc._id === newIncident._id)) return prev;
        return [newIncident, ...prev];
      });
      setLiveBanner(`New incident on map: "${newIncident.title}"`);
      setTimeout(() => setLiveBanner(null), 5000);
    };

    const handleUpdatedIncident = (updatedIncident: Incident) => {
      setIncidents((prev) =>
        prev.map((inc) => (inc._id === updatedIncident._id ? updatedIncident : inc))
      );
      setLiveBanner(`Marker updated: "${updatedIncident.title}" status is now ${updatedIncident.status}`);
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
    socket.on('incident:upvoted', handleUpvotedIncident);

    return () => {
      socket.emit('unsubscribe:area', { lat, lng });
      socket.off('incident:new', handleNewIncident);
      socket.off('incident:updated', handleUpdatedIncident);
      socket.off('incident:upvoted', handleUpvotedIncident);
    };
  }, [lastFetchedCenter]);

  // Client-side filtering logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      // Category filter
      if (!selectedCategories.has(incident.category)) {
        return false;
      }
      // Status filter
      if (selectedStatus === 'active') {
        return incident.status !== 'resolved' && incident.status !== 'rejected';
      }
      if (selectedStatus !== 'all') {
        return incident.status === selectedStatus;
      }
      return true;
    });
  }, [incidents, selectedCategories, selectedStatus]);

  const handleToggleCategory = (cat: IncidentCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(new Set(['pothole', 'streetlight', 'garbage', 'flooding', 'safety', 'other']));
  };

  const handleClearAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const getStatusBadgeStyle = (status: string) => {
    let bg = '#6c757d';
    if (status === 'resolved') bg = '#28a745';
    if (status === 'in_progress') bg = '#ffc107';
    if (status === 'acknowledged') bg = '#17a2b8';
    if (status === 'rejected') bg = '#dc3545';

    return {
      backgroundColor: bg,
      color: '#ffffff',
      padding: '3px 8px',
      borderRadius: '10px',
      fontSize: '11px',
      fontWeight: 'bold' as const,
      textTransform: 'uppercase' as const,
      display: 'inline-block',
      marginTop: '4px'
    };
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header & Navigation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapIcon size={28} color="var(--primary)" /> Live Incident Map
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
            Showing <strong style={{ color: 'var(--primary)' }}>{filteredIncidents.length}</strong> active marker{filteredIncidents.length === 1 ? '' : 's'} in this area
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/report" className="btn-primary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PlusCircle size={15} /> Report Incident
          </Link>
          <Link to="/incidents" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px' }}>
            Incident Feed
          </Link>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '9px 16px', fontSize: '13px' }}>
            Dashboard
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
            marginBottom: '16px',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Radio size={16} /> {liveBanner}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'var(--color-critical-bg)',
            color: 'var(--color-critical-text)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-card)',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <IncidentMapFilters
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onSelectAllCategories={handleSelectAllCategories}
        onClearAllCategories={handleClearAllCategories}
      />

      {/* Map Container Viewport */}
      <div
        className="dash-card"
        style={{
          position: 'relative',
          height: '640px',
          width: '100%',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Floating "Search this area" Button */}
        {showSearchArea && (
          <button
            onClick={() => fetchIncidentsForCenter(currentMapCenter)}
            style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Search size={14} /> Search This Area
          </button>
        )}

        {loading && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              zIndex: 1000,
              backgroundColor: 'rgba(255,255,255,0.95)',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              color: 'var(--text-main)'
            }}
          >
            Fetching incidents...
          </div>
        )}

        <MapContainer
          center={center}
          zoom={5}
          minZoom={4}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController onCenterChange={handleCenterChange} />

          {/* Clustered Marker Layer */}
          <MarkerClusterGroup chunkedLoading>
            {filteredIncidents.map((incident) => {
              const [lng, lat] = incident.location.coordinates;
              return (
                <Marker
                  key={incident._id}
                  position={[lat, lng]}
                  icon={createCategoryIcon(incident.category)}
                >
                  <Popup>
                    <div style={{ minWidth: '180px', maxWidth: '240px' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#111' }}>
                        {incident.title}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                        <span><strong>Category:</strong> {incident.category}</span><br />
                        <span style={getStatusBadgeStyle(incident.status)}>
                          {incident.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#333', margin: '6px 0' }}>
                        {incident.description.length > 120
                          ? `${incident.description.slice(0, 120)}...`
                          : incident.description}
                      </p>
                      {incident.address && (
                        <div style={{ fontSize: '11px', color: '#777', margin: '4px 0' }}>
                          📍 {incident.address}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ThumbsUp size={13} /> <span><strong>Upvotes:</strong> {incident.upvotes?.length || 0}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
};

export default IncidentMap;
