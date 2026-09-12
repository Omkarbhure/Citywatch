import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useAnalytics } from '../../hooks/useAnalytics';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('useAnalytics hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAnalytics should GET /api/analytics with query params and return data', async () => {
    const mockAnalyticsData = {
      summary: {
        totalIncidents: 10,
        avgResolutionHours: 4.5,
        slaBreachCount: 1,
        slaThresholdHours: 72,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T00:00:00.000Z',
      },
      categories: [{ category: 'pothole', count: 5 }],
      statuses: [{ status: 'resolved', count: 8 }],
      timeline: [{ date: '2026-01-15', count: 3 }],
      hotspots: [{ lat: 12.97, lng: 77.59, count: 4, address: 'MG Road' }],
      slaBreaches: [],
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockAnalyticsData });

    const { result } = renderHook(() => useAnalytics());
    const params = {
      from: '2026-01-01',
      to: '2026-01-31',
      slaHours: 48,
    };

    let data;
    await act(async () => {
      data = await result.current.getAnalytics(params);
    });

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics', { params });
    expect(data).toEqual(mockAnalyticsData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle API failure and set error state', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { data: { message: 'Server error computing analytics' } },
    });

    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      await expect(result.current.getAnalytics()).rejects.toThrow('Server error computing analytics');
    });

    expect(result.current.error).toBe('Server error computing analytics');
    expect(result.current.loading).toBe(false);
  });
});
