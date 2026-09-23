import React, { useState } from 'react';
import { KnowledgeEntry, KnowledgeCategoryEnum } from '../../shared/schemas/knowledge';
import { Search, Plus, Trash2, Edit2, Check, BookOpen, Tag } from 'lucide-react';

interface KnowledgeViewProps {
  knowledge: KnowledgeEntry[];
  onSaveEntry: (entry: KnowledgeEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  knowledge,
  onSaveEntry,
  onDeleteEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);

  const categories = KnowledgeCategoryEnum.options;

  const filtered = knowledge.filter((k) => {
    const matchesCat = selectedCategory === 'all' || k.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      k.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      k.longVersion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleStartNew = () => {
    const newEntry: KnowledgeEntry = {
      id: `know_${Date.now()}`,
      category: 'Research interests',
      title: '',
      canonicalFacts: [],
      longVersion: '',
      tags: [],
      relatedSkills: [],
      opportunityTypes: [],
      evidence: [],
      sensitivity: 'normal',
      allowAIUse: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingEntry(newEntry);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry || !editingEntry.title.trim()) return;
    await onSaveEntry(editingEntry);
    setEditingEntry(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Grounded Knowledge Base</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Factual grounding context for AI ({knowledge.length} entries)
          </span>
        </div>
        <button
          onClick={handleStartNew}
          style={{
            height: '32px',
            padding: '0 10px',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Plus size={14} /> Add Entry
        </button>
      </div>

      {/* Search and Category Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge titles, tags, facts..."
            style={{ width: '100%', paddingLeft: '28px', fontSize: '12px' }}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ fontSize: '11px', padding: '4px 6px', backgroundColor: 'var(--bg-surface)' }}
        >
          <option value="all">All Categories ({knowledge.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Editing Modal or Inline Form */}
      {editingEntry && (
        <div
          style={{
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
            {editingEntry.title ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Category</label>
            <select
              value={editingEntry.category}
              onChange={(e) => setEditingEntry({ ...editingEntry, category: e.target.value })}
              style={{ width: '100%', fontSize: '11px' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Title / Topic</label>
            <input
              type="text"
              value={editingEntry.title}
              onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
              placeholder="e.g. Verification of autonomous tool-calling agents"
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Canonical Facts (bulleted ground truth)
            </label>
            <textarea
              value={editingEntry.canonicalFacts.join('\n')}
              onChange={(e) =>
                setEditingEntry({
                  ...editingEntry,
                  canonicalFacts: e.target.value.split('\n').filter((l) => l.trim()),
                })
              }
              rows={3}
              placeholder="Enter one verified fact per line..."
              style={{ width: '100%', fontSize: '11px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Detailed Description</label>
            <textarea
              value={editingEntry.longVersion}
              onChange={(e) => setEditingEntry({ ...editingEntry, longVersion: e.target.value })}
              rows={4}
              placeholder="Full contextual narrative or experimental findings..."
              style={{ width: '100%', fontSize: '11px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tags (comma separated)</label>
            <input
              type="text"
              value={editingEntry.tags.join(', ')}
              onChange={(e) =>
                setEditingEntry({
                  ...editingEntry,
                  tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                })
              }
              style={{ width: '100%', fontSize: '11px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
            <button
              onClick={() => setEditingEntry(null)}
              style={{ fontSize: '11px', padding: '4px 10px', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Entry List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No knowledge entries found matching your search.
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {entry.category}
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {entry.title}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setEditingEntry(entry)}
                    title="Edit entry"
                    style={{ padding: '3px', color: 'var(--text-secondary)' }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    title="Delete entry"
                    style={{ padding: '3px', color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {entry.shortVersion || entry.longVersion.slice(0, 160)}
                {entry.longVersion.length > 160 ? '...' : ''}
              </div>

              {entry.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                  {entry.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
