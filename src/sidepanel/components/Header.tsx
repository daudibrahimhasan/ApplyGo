import React from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { PageOpportunity } from '../../shared/schemas/fields';

interface HeaderProps {
  opportunity: PageOpportunity | null;
  onOpenSettings: () => void;
  onRefreshScan: () => void;
  isScanning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings, onRefreshScan, isScanning,
}) => (
  <header className="ocean-header">
    <div className="ocean-brand"><img src="/branding/logo.png" alt="" width={30} height={30} /><span>ApplyGo</span></div>
    <div className="ocean-header-actions">
      <button onClick={onRefreshScan} disabled={isScanning} aria-label="Rescan page fields" title="Rescan page">
        <RefreshCw size={17} className={isScanning ? 'spin' : undefined} />
      </button>
      <button onClick={onOpenSettings} aria-label="Open settings" title="Settings"><Settings size={18} /></button>
    </div>
  </header>
);
