import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useIncidents } from '../../hooks/useIncidents';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('useIncidents hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createIncident should POST to /api/incidents with correct payload', async () => {
    const mockCreatedIncident = {
      _id: 'inc-123',
      title: 'Pothole on Main St',
      category: 'pothole',
      status: 'pending',
    };
    mockedAxios.post.mockResolvedValueOnce({ data: mockCreatedIncident });

    const { result } = renderHook(() => useIncidents());
    const payload = {
      title: 'Pothole on Main St',
      description: 'Big pothole in middle lane',
      category: 'pothole' as const,
      coordinates: [77.5946, 12.9716] as [number, number],
    };

    let data;
    await act(async () => {
      data = await result.current.createIncident(payload);
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/incidents', payload);
    expect(data).toEqual(mockCreatedIncident);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('getIncidents should GET /api/incidents with query params', async () => {
    const mockResponse = {
      incidents: [{ _id: '1', title: 'Test' }],
      page: 1,
      totalPages: 1,
      total: 1,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useIncidents());
    const params = { status: 'pending', category: 'pothole' as const, page: 1, limit: 10 };

    let data;
    await act(async () => {
      data = await result.current.getIncidents(params);
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/incidents', { params });
    expect(data).toEqual(mockResponse);
  });

  it('getIncidentById should GET /api/incidents/:id', async () => {
    const mockIncident = { _id: 'inc-1', title: 'Streetlight out' };
    mockedAxios.get.mockResolvedValueOnce({ data: mockIncident });

    const { result } = renderHook(() => useIncidents());

    let data;
    await act(async () => {
      data = await result.current.getIncidentById('inc-1');
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/incidents/inc-1');
    expect(data).toEqual(mockIncident);
  });

  it('updateIncidentStatus should PATCH /api/incidents/:id/status', async () => {
    const mockUpdated = { _id: 'inc-1', status: 'in_progress' };
    mockedAxios.patch.mockResolvedValueOnce({ data: mockUpdated });

    const { result } = renderHook(() => useIncidents());

    let data;
    await act(async () => {
      data = await result.current.updateIncidentStatus('inc-1', { status: 'in_progress', note: 'Crew assigned' });
    });

    expect(mockedAxios.patch).toHaveBeenCalledWith('/api/incidents/inc-1/status', {
      status: 'in_progress',
      note: 'Crew assigned',
    });
    expect(data).toEqual(mockUpdated);
  });

  it('upvoteIncident should POST /api/incidents/:id/upvote', async () => {
    const mockUpvoteRes = { message: 'Incident upvoted successfully', upvotesCount: 5, upvoted: true };
    mockedAxios.post.mockResolvedValueOnce({ data: mockUpvoteRes });

    const { result } = renderHook(() => useIncidents());

    let data;
    await act(async () => {
      data = await result.current.upvoteIncident('inc-1');
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/incidents/inc-1/upvote');
    expect(data).toEqual(mockUpvoteRes);
  });

  it('should handle API errors and update error state', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: 'Validation failed' } },
    });

    const { result } = renderHook(() => useIncidents());

    await act(async () => {
      await expect(
        result.current.createIncident({
          title: '',
          description: '',
          category: 'other' as const,
          coordinates: [0, 0],
        })
      ).rejects.toThrow('Validation failed');
    });

    expect(result.current.error).toBe('Validation failed');
    expect(result.current.loading).toBe(false);
  });
});
