import React from 'react';
export type TabId = 'apply' | 'questions' | 'profile' | 'knowledge' | 'activity';
interface NavTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  questionCount?: number;
  unresolvedCount?: number;
}
export const NavTabs: React.FC<NavTabsProps> = ({ activeTab, onTabChange }) => (
  <nav className="ocean-nav" aria-label="Extension sections">
    {([
      ['apply', 'Apply'], ['questions', 'Questions'], ['profile', 'Profile'],
      ['knowledge', 'Knowledge'], ['activity', 'Activity'],
    ] as Array<[TabId, string]>).map(([id, label]) => (
      <button key={id} aria-current={activeTab === id ? 'page' : undefined}
        onClick={() => onTabChange(id)}>{label}</button>
    ))}
  </nav>
);
