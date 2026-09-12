import { useState, useCallback } from 'react';
import axios from 'axios';
import { AnalyticsData, AnalyticsParams } from '../types/analytics';

export const useAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAnalytics = useCallback(async (params?: AnalyticsParams): Promise<AnalyticsData> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<AnalyticsData>('/api/analytics', { params });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch analytics data';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getAnalytics
  };
};

export default useAnalytics;
