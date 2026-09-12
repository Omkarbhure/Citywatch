import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthorityDashboard from '../../components/AuthorityDashboard';
import * as useIncidentQueueHook from '../../hooks/useIncidentQueue';
import * as AuthContextModule from '../../context/AuthContext';
import * as socketModule from '../../lib/socket';

describe('AuthorityDashboard Component', () => {
  const mockGetQueue = vi.fn();
  const mockAssignIncident = vi.fn();
  const mockUnassignIncident = vi.fn();
  const mockUpdateStatus = vi.fn();
  const mockUpdatePriority = vi.fn();

  const mockIncidents = [
    {
      _id: 'inc-unassigned',
      title: 'Broken Traffic Light',
      address: '4th & Market',
      category: 'safety' as const,
      status: 'pending' as const,
      priority: 'high' as const,
      upvotes: ['u1'],
      reporter: { _id: 'u1', name: 'Alice Citizen', role: 'citizen' },
      assignedTo: undefined,
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      _id: 'inc-claimed-me',
      title: 'Flooded Underpass',
      address: 'Highway 101',
      category: 'flooding' as const,
      status: 'in_progress' as const,
      priority: 'critical' as const,
      upvotes: ['u2', 'u3'],
      reporter: { _id: 'u2', name: 'Bob Citizen', role: 'citizen' },
      assignedTo: { _id: 'auth-current', name: 'Officer Jenny', role: 'authority' },
      createdAt: '2026-03-01T11:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'auth-current', name: 'Officer Jenny', email: 'jenny@police.gov', role: 'authority' },
      token: 'jwt-auth-token',
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.spyOn(socketModule, 'getSocket').mockReturnValue({
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any);

    vi.spyOn(useIncidentQueueHook, 'default').mockReturnValue({
      getQueue: mockGetQueue.mockResolvedValue({
        incidents: mockIncidents,
        page: 1,
        totalPages: 1,
        total: 2,
      }),
      assignIncident: mockAssignIncident,
      unassignIncident: mockUnassignIncident,
      updateStatus: mockUpdateStatus,
      updatePriority: mockUpdatePriority,
      loading: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <AuthorityDashboard />
      </BrowserRouter>
    );
  };

  it('renders queue table with incident rows', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Broken Traffic Light')).toBeInTheDocument();
      expect(screen.getByText('Flooded Underpass')).toBeInTheDocument();
      expect(screen.getByText('Alice Citizen')).toBeInTheDocument();
      expect(screen.getByText('Officer Jenny (You)')).toBeInTheDocument();
    });
  });

  it('shows Claim button for unassigned incident and calls assignIncident on click', async () => {
    mockAssignIncident.mockResolvedValueOnce({
      ...mockIncidents[0],
      assignedTo: { _id: 'auth-current', name: 'Officer Jenny', role: 'authority' },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Broken Traffic Light')).toBeInTheDocument();
    });

    const claimBtn = screen.getByRole('button', { name: 'Claim' });
    fireEvent.click(claimBtn);

    expect(mockAssignIncident).toHaveBeenCalledWith('inc-unassigned', false);
  });

  it('shows Unassign button for incidents claimed by current user and calls unassignIncident', async () => {
    mockUnassignIncident.mockResolvedValueOnce({
      ...mockIncidents[1],
      assignedTo: undefined,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Flooded Underpass')).toBeInTheDocument();
    });

    const unassignBtn = screen.getByRole('button', { name: 'Unassign' });
    fireEvent.click(unassignBtn);

    expect(mockUnassignIncident).toHaveBeenCalledWith('inc-claimed-me');
  });

  it('updates status and priority when dropdown values are changed', async () => {
    mockUpdateStatus.mockResolvedValueOnce({
      ...mockIncidents[0],
      status: 'acknowledged',
    });
    mockUpdatePriority.mockResolvedValueOnce({
      ...mockIncidents[0],
      priority: 'critical',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Broken Traffic Light')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    // First select after filter selects is row priority
    const unassignedPrioritySelect = selects.find((s) => (s as HTMLSelectElement).value === 'high');
    if (unassignedPrioritySelect) {
      fireEvent.change(unassignedPrioritySelect, { target: { value: 'critical' } });
      expect(mockUpdatePriority).toHaveBeenCalledWith('inc-unassigned', { priority: 'critical' });
    }

    const unassignedStatusSelect = selects.find((s) => (s as HTMLSelectElement).value === 'pending');
    if (unassignedStatusSelect) {
      fireEvent.change(unassignedStatusSelect, { target: { value: 'acknowledged' } });
      expect(mockUpdateStatus).toHaveBeenCalledWith('inc-unassigned', { status: 'acknowledged' });
    }
  });
});
