export type IncidentCategory =
  | 'pothole'
  | 'streetlight'
  | 'garbage'
  | 'flooding'
  | 'safety'
  | 'other';

export type IncidentStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export interface UserSummary {
  _id: string;
  name: string;
  role: 'citizen' | 'authority';
}

export interface StatusHistoryEntry {
  status: IncidentStatus;
  changedBy: UserSummary | string;
  note?: string;
  timestamp: string;
}

export interface IncidentLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Incident {
  _id: string;
  reporter: UserSummary | string;
  title: string;
  description: string;
  category: IncidentCategory;
  location: IncidentLocation;
  address?: string;
  media: string[];
  status: IncidentStatus;
  priority: IncidentPriority;
  upvotes: string[];
  assignedTo?: UserSummary | string;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  category: IncidentCategory;
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
  media?: string[];
}

export interface UpdateStatusInput {
  status: IncidentStatus;
  note?: string;
}

export interface GetIncidentsParams {
  near?: string; // "lat,lng"
  radius?: number;
  status?: IncidentStatus;
  category?: IncidentCategory;
  page?: number;
  limit?: number;
}

export interface GetIncidentsResponse {
  incidents: Incident[];
  page: number;
  totalPages: number;
  total: number;
}
