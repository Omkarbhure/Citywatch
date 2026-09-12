import React from 'react';
import { IncidentCategory, IncidentStatus } from '../types/incident';

interface IncidentMapFiltersProps {
  selectedCategories: Set<IncidentCategory>;
  onToggleCategory: (category: IncidentCategory) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onSelectAllCategories: () => void;
  onClearAllCategories: () => void;
}

const CATEGORIES: { label: string; value: IncidentCategory; color: string }[] = [
  { label: 'Pothole', value: 'pothole', color: '#e65100' },
  { label: 'Streetlight', value: 'streetlight', color: '#f57f17' },
  { label: 'Garbage', value: 'garbage', color: '#546e7a' },
  { label: 'Flooding', value: 'flooding', color: '#0288d1' },
  { label: 'Safety', value: 'safety', color: '#d32f2f' },
  { label: 'Other', value: 'other', color: '#7b1fa2' }
];

const STATUSES: { label: string; value: string }[] = [
  { label: 'All Non-Resolved', value: 'active' },
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Rejected', value: 'rejected' }
];

export const IncidentMapFilters: React.FC<IncidentMapFiltersProps> = ({
  selectedCategories,
  onToggleCategory,
  selectedStatus,
  onStatusChange,
  onSelectAllCategories,
  onClearAllCategories
}) => {
  return (
    <div
      className="dash-card"
      style={{
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      {/* Category Pills / Checkboxes */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginRight: '4px' }}>Categories:</span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.has(cat.value);
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => onToggleCategory(cat.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 500,
                border: isSelected ? `1.5px solid ${cat.color}` : '1.5px solid var(--border-color)',
                backgroundColor: isSelected ? cat.color : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                boxShadow: isSelected ? `0 2px 8px ${cat.color}40` : 'none'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isSelected ? '#FFFFFF' : cat.color
                }}
              />
              {cat.label}
            </button>
          );
        })}

        <div style={{ marginLeft: '6px', display: 'inline-flex', gap: '6px' }}>
          <button
            type="button"
            onClick={onSelectAllCategories}
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            All
          </button>
          <button
            type="button"
            onClick={onClearAllCategories}
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            None
          </button>
        </div>
      </div>

      {/* Status Filter Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Status:</label>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="dash-select"
          style={{ padding: '6px 12px', fontSize: '13px' }}
        >
          {STATUSES.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default IncidentMapFilters;
