import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Incident,
  IncidentCategory,
  IncidentStatus,
  IncidentPriority,
  UpdateStatusInput
} from '../types/incident';

export interface QueueFilters {
  status?: string;
  category?: IncidentCategory | 'all';
  priority?: IncidentPriority | 'all';
  assignedTo?: 'all' | 'me' | 'unassigned' | string;
  sortBy?: 'priority' | 'upvotes' | 'oldest' | 'newest';
  page?: number;
  limit?: number;
}

export interface QueueResponse {
  incidents: Incident[];
  page: number;
  totalPages: number;
  total: number;
}

export const useIncidentQueue = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQueue = useCallback(async (params?: QueueFilters): Promise<QueueResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<QueueResponse>('/api/incidents/queue', { params });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch incident queue';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignIncident = useCallback(async (id: string, force: boolean = false): Promise<Incident> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch<Incident>(`/api/incidents/${id}/assign`, { force });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to assign incident';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const unassignIncident = useCallback(async (id: string): Promise<Incident> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch<Incident>(`/api/incidents/${id}/unassign`);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to unassign incident';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, data: UpdateStatusInput): Promise<Incident> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch<Incident>(`/api/incidents/${id}/status`, data);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update status';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePriority = useCallback(
    async (id: string, data: { priority: IncidentPriority; note?: string }): Promise<Incident> => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.patch<Incident>(`/api/incidents/${id}/priority`, data);
        return response.data;
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to update priority';
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    getQueue,
    assignIncident,
    unassignIncident,
    updateStatus,
    updatePriority
  };
};

export default useIncidentQueue;
