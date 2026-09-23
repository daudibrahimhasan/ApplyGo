import React from 'react';
import { FileText, Sparkles, User, BookOpen, History } from 'lucide-react';

export type TabId = 'apply' | 'questions' | 'profile' | 'knowledge' | 'activity';

interface NavTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  questionCount?: number;
  unresolvedCount?: number;
}

export const NavTabs: React.FC<NavTabsProps> = ({
  activeTab,
  onTabChange,
  questionCount = 0,
  unresolvedCount = 0,
}) => {
  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'apply', label: 'Apply', icon: <FileText size={15} />, badge: unresolvedCount > 0 ? unresolvedCount : undefined },
    { id: 'questions', label: 'Questions', icon: <Sparkles size={15} />, badge: questionCount > 0 ? questionCount : undefined },
    { id: 'profile', label: 'Profile', icon: <User size={15} /> },
    { id: 'knowledge', label: 'Knowledge', icon: <BookOpen size={15} /> },
    { id: 'activity', label: 'Activity', icon: <History size={15} /> },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              minWidth: '68px',
              height: '44px', // Touch/click friendly target
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              fontSize: '11px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
              position: 'relative',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              {tab.icon}
              {tab.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-8px',
                    backgroundColor: tab.id === 'questions' ? 'var(--accent-primary)' : 'var(--warning)',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '0 4px',
                    borderRadius: '8px',
                    minWidth: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
