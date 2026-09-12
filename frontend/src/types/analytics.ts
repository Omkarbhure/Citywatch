import { IncidentCategory, IncidentPriority, IncidentStatus } from './incident';

export interface AnalyticsSummary {
  totalIncidents: number;
  avgResolutionHours: number;
  slaBreachCount: number;
  slaThresholdHours: number;
  from: string;
  to: string;
}

export interface CategoryMetric {
  category: IncidentCategory;
  count: number;
}

export interface StatusMetric {
  status: IncidentStatus;
  count: number;
}

export interface TimelineMetric {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface HotspotMetric {
  lat: number;
  lng: number;
  address: string;
  count: number;
}

export interface SLABreachItem {
  _id: string;
  title: string;
  category: IncidentCategory;
  status: IncidentStatus;
  priority: IncidentPriority;
  createdAt: string;
  hoursOpen: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  categories: CategoryMetric[];
  statuses: StatusMetric[];
  timeline: TimelineMetric[];
  hotspots: HotspotMetric[];
  slaBreaches: SLABreachItem[];
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
  slaHours?: number;
}
