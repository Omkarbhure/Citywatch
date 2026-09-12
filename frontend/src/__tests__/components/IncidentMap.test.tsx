import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import IncidentMap from '../../components/IncidentMap';
import IncidentMapFilters from '../../components/IncidentMapFilters';
import * as useIncidentsHook from '../../hooks/useIncidents';
import * as socketModule from '../../lib/socket';

// Mock Leaflet and React-Leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position, children }: any) => (
    <div data-testid="map-marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="marker-popup">{children}</div>,
  useMapEvents: () => ({
    getCenter: () => ({ lat: 37.7749, lng: -122.4194 }),
  }),
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }: any) => <div data-testid="marker-cluster-group">{children}</div>,
}));

describe('IncidentMap & Filter Components', () => {
  const mockIncidents = [
    {
      _id: 'inc-pothole',
      title: 'Main St Pothole',
      description: 'Pothole on Main St',
      category: 'pothole' as const,
      status: 'pending' as const,
      priority: 'medium' as const,
      location: { type: 'Point' as const, coordinates: [-122.4194, 37.7749] as [number, number] },
      upvotes: ['u1'],
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      _id: 'inc-flooding',
      title: 'River Overflow',
      description: 'Water over bridge',
      category: 'flooding' as const,
      status: 'in_progress' as const,
      priority: 'high' as const,
      location: { type: 'Point' as const, coordinates: [-122.42, 37.78] as [number, number] },
      upvotes: [],
      createdAt: '2026-03-01T10:30:00.000Z',
    },
    {
      _id: 'inc-resolved',
      title: 'Fixed Light',
      description: 'Replaced bulb',
      category: 'streetlight' as const,
      status: 'resolved' as const,
      priority: 'low' as const,
      location: { type: 'Point' as const, coordinates: [-122.43, 37.79] as [number, number] },
      upvotes: [],
      createdAt: '2026-03-01T09:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(socketModule, 'getSocket').mockReturnValue({
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any);

    vi.spyOn(useIncidentsHook, 'default').mockReturnValue({
      getIncidents: vi.fn().mockResolvedValue({
        incidents: mockIncidents,
        page: 1,
        totalPages: 1,
        total: 3,
      }),
      createIncident: vi.fn(),
      getIncidentById: vi.fn(),
      updateIncidentStatus: vi.fn(),
      upvoteIncident: vi.fn(),
      loading: false,
      error: null,
    });
  });

  it('renders MapContainer and filter controls', async () => {
    render(
      <BrowserRouter>
        <IncidentMap />
      </BrowserRouter>
    );

    expect(screen.getByText(/Live Incident Map/i)).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByText('Pothole')).toBeInTheDocument();
    expect(screen.getByText('Flooding')).toBeInTheDocument();
  });

  it('renders markers for active (non-resolved) incidents by default', async () => {
    render(
      <BrowserRouter>
        <IncidentMap />
      </BrowserRouter>
    );

    await waitFor(() => {
      // By default selectedStatus is 'active' (excludes resolved)
      // So 2 markers should be rendered: pothole and flooding
      const markers = screen.getAllByTestId('map-marker');
      expect(markers.length).toBe(2);
      expect(screen.getByText('Main St Pothole')).toBeInTheDocument();
      expect(screen.getByText('River Overflow')).toBeInTheDocument();
      expect(screen.queryByText('Fixed Light')).not.toBeInTheDocument();
    });
  });

  it('IncidentMapFilters: toggles category filter correctly', () => {
    const mockToggle = vi.fn();
    const mockStatusChange = vi.fn();
    const mockSelectAll = vi.fn();
    const mockClearAll = vi.fn();

    render(
      <IncidentMapFilters
        selectedCategories={new Set(['pothole', 'garbage'])}
        onToggleCategory={mockToggle}
        selectedStatus="all"
        onStatusChange={mockStatusChange}
        onSelectAllCategories={mockSelectAll}
        onClearAllCategories={mockClearAll}
      />
    );

    const potholeBtn = screen.getByRole('button', { name: /pothole/i });
    fireEvent.click(potholeBtn);
    expect(mockToggle).toHaveBeenCalledWith('pothole');

    const selectAllBtn = screen.getByRole('button', { name: 'All' });
    fireEvent.click(selectAllBtn);
    expect(mockSelectAll).toHaveBeenCalled();

    const noneBtn = screen.getByRole('button', { name: 'None' });
    fireEvent.click(noneBtn);
    expect(mockClearAll).toHaveBeenCalled();
  });
});
