import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useIncidentQueue } from '../../hooks/useIncidentQueue';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('useIncidentQueue hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getQueue should GET /api/incidents/queue with filter parameters', async () => {
    const mockQueueResponse = {
      incidents: [{ _id: 'inc-1', title: 'Test Queue Item', priority: 'high', status: 'pending' }],
      page: 1,
      totalPages: 1,
      total: 1,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockQueueResponse });

    const { result } = renderHook(() => useIncidentQueue());
    const filters = {
      status: 'pending',
      category: 'flooding' as const,
      priority: 'high' as const,
      assignedTo: 'unassigned',
      sortBy: 'priority' as const,
      page: 1,
      limit: 25,
    };

    let data;
    await act(async () => {
      data = await result.current.getQueue(filters);
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/incidents/queue', { params: filters });
    expect(data).toEqual(mockQueueResponse);
  });

  it('assignIncident should PATCH /api/incidents/:id/assign', async () => {
    const mockAssigned = { _id: 'inc-1', assignedTo: { _id: 'auth-1', name: 'Officer Smith' } };
    mockedAxios.patch.mockResolvedValueOnce({ data: mockAssigned });

    const { result } = renderHook(() => useIncidentQueue());

    let data;
    await act(async () => {
      data = await result.current.assignIncident('inc-1', true);
    });

    expect(mockedAxios.patch).toHaveBeenCalledWith('/api/incidents/inc-1/assign', { force: true });
    expect(data).toEqual(mockAssigned);
  });

  it('unassignIncident should PATCH /api/incidents/:id/unassign', async () => {
    const mockUnassigned = { _id: 'inc-1', assignedTo: undefined };
    mockedAxios.patch.mockResolvedValueOnce({ data: mockUnassigned });

    const { result } = renderHook(() => useIncidentQueue());

    let data;
    await act(async () => {
      data = await result.current.unassignIncident('inc-1');
    });

    expect(mockedAxios.patch).toHaveBeenCalledWith('/api/incidents/inc-1/unassign');
    expect(data).toEqual(mockUnassigned);
  });

  it('updatePriority should PATCH /api/incidents/:id/priority', async () => {
    const mockPriorityUpdated = { _id: 'inc-1', priority: 'critical' };
    mockedAxios.patch.mockResolvedValueOnce({ data: mockPriorityUpdated });

    const { result } = renderHook(() => useIncidentQueue());

    let data;
    await act(async () => {
      data = await result.current.updatePriority('inc-1', { priority: 'critical', note: 'Immediate hazard' });
    });

    expect(mockedAxios.patch).toHaveBeenCalledWith('/api/incidents/inc-1/priority', {
      priority: 'critical',
      note: 'Immediate hazard',
    });
    expect(data).toEqual(mockPriorityUpdated);
  });
});
