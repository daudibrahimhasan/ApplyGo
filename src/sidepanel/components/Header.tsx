import React from 'react';
import { Settings, ShieldCheck, RefreshCw } from 'lucide-react';
import { PageOpportunity } from '../../shared/schemas/fields';

interface HeaderProps {
  opportunity: PageOpportunity | null;
  onOpenSettings: () => void;
  onRefreshScan: () => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  opportunity,
  onOpenSettings,
  onRefreshScan,
  isScanning,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '12px',
          }}
        >
          G
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '-0.2px' }}>
              GroundedApply
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                fontWeight: 500,
              }}
            >
              <ShieldCheck size={10} /> Local
            </span>
          </div>
          {opportunity?.opportunityName && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={opportunity.opportunityName}
            >
              {opportunity.organization ? `${opportunity.organization} • ` : ''}
              {opportunity.opportunityName}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={onRefreshScan}
          disabled={isScanning}
          aria-label="Rescan page fields"
          title="Rescan page fields"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            transition: 'background-color 0.15s',
          }}
        >
          <RefreshCw size={15} style={{ animation: isScanning ? 'spin 1s linear infinite' : 'none' }} />
        </button>

        <button
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Open settings"
          style={{
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            transition: 'background-color 0.15s',
          }}
        >
          <Settings size={16} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};
