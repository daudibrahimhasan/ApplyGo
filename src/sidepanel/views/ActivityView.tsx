import React, { useState } from 'react';
import { ApplicationHistory } from '../../shared/schemas/application';
import { History, ExternalLink, Edit3, CheckCircle, Clock } from 'lucide-react';

interface ActivityViewProps {
  applications: ApplicationHistory[];
  onUpdateApplication: (app: ApplicationHistory) => Promise<void>;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  applications,
  onUpdateApplication,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const statuses: ApplicationHistory['status'][] = [
    'draft',
    'applied',
    'interviewing',
    'rejected',
    'accepted',
    'closed',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Application Activity</h2>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Locally tracked applications ({applications.length})
        </span>
      </div>

      {applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <History size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p>No tracked applications yet.</p>
          <p style={{ fontSize: '11px', marginTop: '4px' }}>
            When you scan and fill forms, GroundedApply records your progress locally.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {applications.map((app) => (
            <div
              key={app.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {app.opportunity}
                  </div>
                  {app.organization && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {app.organization} • {app.opportunityType}
                    </div>
                  )}
                </div>

                <select
                  value={app.status}
                  onChange={(e) =>
                    onUpdateApplication({ ...app, status: e.target.value as ApplicationHistory['status'] })
                  }
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span>Opened: {new Date(app.dateOpened).toLocaleDateString()}</span>
                {app.dateFilled && <span>Filled: {new Date(app.dateFilled).toLocaleDateString()}</span>}
                {app.resumeUsed && <span>Resume: {app.resumeUsed}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Answers: {app.answersGenerated} generated • {app.answersInserted} inserted
                </span>

                {app.url && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open link</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
