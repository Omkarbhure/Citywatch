import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import IncidentFeed from '../../components/IncidentFeed';
import * as useIncidentsHook from '../../hooks/useIncidents';
import * as socketModule from '../../lib/socket';

describe('IncidentFeed Component', () => {
  const mockGetIncidents = vi.fn();
  const mockUpvoteIncident = vi.fn();
  const socketCallbacks: Record<string, Function> = {};

  const mockSocket = {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: Function) => {
      socketCallbacks[event] = cb;
    }),
    off: vi.fn((event: string) => {
      delete socketCallbacks[event];
    }),
  };

  const initialIncidents = [
    {
      _id: 'inc-1',
      title: 'Water Leak on 5th Ave',
      description: 'Major flooding on street',
      category: 'flooding' as const,
      status: 'pending' as const,
      priority: 'high' as const,
      location: { type: 'Point' as const, coordinates: [77.59, 12.97] as [number, number] },
      upvotes: ['u1', 'u2'],
      createdAt: '2026-03-01T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key in socketCallbacks) delete socketCallbacks[key];

    vi.spyOn(socketModule, 'getSocket').mockReturnValue(mockSocket as any);
    vi.spyOn(useIncidentsHook, 'default').mockReturnValue({
      getIncidents: mockGetIncidents.mockResolvedValue({
        incidents: initialIncidents,
        page: 1,
        totalPages: 1,
        total: 1,
      }),
      createIncident: vi.fn(),
      getIncidentById: vi.fn(),
      updateIncidentStatus: vi.fn(),
      upvoteIncident: mockUpvoteIncident,
      loading: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <IncidentFeed />
      </BrowserRouter>
    );
  };

  it('renders initial list of incidents from hook', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Water Leak on 5th Ave')).toBeInTheDocument();
      expect(screen.getByText('Major flooding on street')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText(/Upvote \(2\)/i)).toBeInTheDocument();
    });
  });

  it('prepends new incident live when incident:new socket event fires without full refetch', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Water Leak on 5th Ave')).toBeInTheDocument();
    });

    const newIncident = {
      _id: 'inc-2',
      title: 'Power Outage downtown',
      description: 'Traffic lights offline',
      category: 'safety' as const,
      status: 'acknowledged' as const,
      priority: 'critical' as const,
      location: { type: 'Point' as const, coordinates: [77.60, 12.98] as [number, number] },
      upvotes: [],
      createdAt: '2026-03-01T11:00:00.000Z',
    };

    act(() => {
      if (socketCallbacks['incident:new']) {
        socketCallbacks['incident:new'](newIncident);
      }
    });

    expect(screen.getByText('Power Outage downtown')).toBeInTheDocument();
    expect(screen.getByText(/New incident reported nearby: "Power Outage downtown"/i)).toBeInTheDocument();
  });

  it('updates matching incident status live when incident:updated socket event fires', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Water Leak on 5th Ave')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    const updatedIncident = {
      ...initialIncidents[0],
      status: 'resolved' as const,
    };

    act(() => {
      if (socketCallbacks['incident:updated']) {
        socketCallbacks['incident:updated'](updatedIncident);
      }
    });

    expect(screen.getByText('resolved')).toBeInTheDocument();
    expect(screen.getByText(/Incident status updated: "Water Leak on 5th Ave" is now RESOLVED/i)).toBeInTheDocument();
  });
});
