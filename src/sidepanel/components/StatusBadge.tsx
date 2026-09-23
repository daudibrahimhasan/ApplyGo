import React from 'react';
import { MatchConfidence, FillState } from '../../shared/schemas/fields';

export const ConfidenceBadge: React.FC<{ confidence: MatchConfidence }> = ({ confidence }) => {
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = 'var(--text-muted)';
  let label = 'Low';

  if (confidence === 'high') {
    bg = 'rgba(16, 185, 129, 0.15)';
    color = 'var(--success)';
    label = 'High Match';
  } else if (confidence === 'medium') {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = 'var(--warning)';
    label = 'Review';
  } else if (confidence === 'blocked') {
    bg = 'rgba(239, 68, 68, 0.15)';
    color = 'var(--danger)';
    label = 'Blocked';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '10px',
        fontWeight: 600,
        backgroundColor: bg,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
      }}
    >
      {label}
    </span>
  );
};

export const FillStateBadge: React.FC<{ state: FillState }> = ({ state }) => {
  if (state === 'filled') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--success)',
        }}
      >
        ● Filled
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--danger)' }}>
        ● Failed
      </span>
    );
  }
  return null;
};
