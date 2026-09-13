import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Incident,
  CreateIncidentInput,
  UpdateStatusInput,
  GetIncidentsParams,
  GetIncidentsResponse
} from '../types/incident';

export const useIncidents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIncident = useCallback(async (data: CreateIncidentInput): Promise<Incident> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<Incident>('/api/incidents', data);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create incident';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getIncidents = useCallback(async (params?: GetIncidentsParams): Promise<GetIncidentsResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<GetIncidentsResponse>('/api/incidents', { params });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch incidents';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getIncidentById = useCallback(async (id: string): Promise<Incident> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Incident>(`/api/incidents/${id}`);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch incident details';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateIncidentStatus = useCallback(async (id: string, data: UpdateStatusInput): Promise<Incident> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch<Incident>(`/api/incidents/${id}/status`, data);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update incident status';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const upvoteIncident = useCallback(async (id: string): Promise<{ message: string; upvotesCount: number; upvoted: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<{ message: string; upvotesCount: number; upvoted: boolean }>(`/api/incidents/${id}/upvote`);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upvote incident';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteIncident = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`/api/incidents/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete incident';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createIncident,
    getIncidents,
    getIncidentById,
    updateIncidentStatus,
    upvoteIncident,
    deleteIncident
  };
};

export default useIncidents;
