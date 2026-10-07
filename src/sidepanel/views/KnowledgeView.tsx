import React, { useState } from 'react';
import { KnowledgeEntry, KnowledgeCategoryEnum } from '../../shared/schemas/knowledge';
import { ProfilePartialUpdate } from '../../shared/schemas/profile';
import { parseMarkdownKnowledge, MarkdownImportResult } from '../../core/importers/markdownImporter';
import { Search, Plus, Trash2, Edit2, FileText, Check, Sparkles } from 'lucide-react';

interface KnowledgeViewProps {
  knowledge: KnowledgeEntry[];
  onSaveEntry: (entry: KnowledgeEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onImportKnowledge?: (entries: KnowledgeEntry[], mode: 'merge' | 'replace') => Promise<void>;
  onApplyProfileUpdates?: (updates: ProfilePartialUpdate) => Promise<void>;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  knowledge,
  onSaveEntry,
  onDeleteEntry,
  onImportKnowledge,
  onApplyProfileUpdates,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);

  // Markdown Import state
  const [pendingImport, setPendingImport] = useState<MarkdownImportResult | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [applyProfileUpdates, setApplyProfileUpdates] = useState(true);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseMarkdownKnowledge(text);
      if (parsed.entries.length === 0) {
        setImportStatusMessage('No valid knowledge sections found in markdown file.');
        return;
      }
      setImportFileName(file.name);
      setPendingImport(parsed);
      setImportStatusMessage(null);
    } catch (err: any) {
      setImportStatusMessage(`Failed to read Markdown file: ${err?.message || String(err)}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    if (onImportKnowledge) {
      await onImportKnowledge(pendingImport.entries, importMode);
    } else {
      for (const entry of pendingImport.entries) {
        await onSaveEntry(entry);
      }
    }

    if (applyProfileUpdates && pendingImport.profileUpdates && onApplyProfileUpdates) {
      await onApplyProfileUpdates(pendingImport.profileUpdates);
    }

    setImportStatusMessage(
      `Successfully imported ${pendingImport.entries.length} knowledge entries from ${importFileName}!`
    );
    setPendingImport(null);
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
        <div style={{ display: 'flex', gap: '6px' }}>
          <label
            style={{
              height: '32px',
              padding: '0 12px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Import Markdown Knowledge Base (.md)"
          >
            <FileText size={13} color="var(--accent-primary)" /> Import .md
            <input
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={handleStartNew}
            style={{
              height: '32px',
              padding: '0 14px',
              background: 'var(--accent-gradient)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(49, 125, 159, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={14} /> Add Entry
          </button>
        </div>
      </div>

      {/* Import Status Notification */}
      {importStatusMessage && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: importStatusMessage.includes('Successfully')
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(239, 68, 68, 0.1)',
            border: importStatusMessage.includes('Successfully')
              ? '1px solid rgba(34, 197, 94, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '11px',
            color: importStatusMessage.includes('Successfully') ? '#15803d' : '#b91c1c',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{importStatusMessage}</span>
          <button
            onClick={() => setImportStatusMessage(null)}
            style={{ fontSize: '10px', fontWeight: 600, color: 'inherit' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Markdown Import Confirmation Preview Modal */}
      {pendingImport && (
        <div
          style={{
            border: '2px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent-primary)" />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Import Markdown Knowledge Base
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Found <strong>{pendingImport.entries.length}</strong> structured entries in{' '}
            <code>{importFileName}</code>
            {pendingImport.documentTitle && ` ("${pendingImport.documentTitle}")`}.
          </div>

          {/* Sample Entries Preview */}
          <div
            style={{
              maxHeight: '110px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-surface-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {pendingImport.entries.map((entry, idx) => (
              <div
                key={entry.id}
                style={{
                  fontSize: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--text-primary)',
                }}
              >
                <span>
                  {idx + 1}. {entry.title}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{entry.category}</span>
              </div>
            ))}
          </div>

          {/* Import Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Import Mode:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              Merge with existing
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Replace all
            </label>
          </div>

          {/* Profile auto-detection checkbox */}
          {pendingImport.profileUpdates && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={applyProfileUpdates}
                onChange={(e) => setApplyProfileUpdates(e.target.checked)}
              />
              <span>
                Also update profile with detected details ({pendingImport.profileUpdates.personal?.firstName ? `${pendingImport.profileUpdates.personal.firstName} ${pendingImport.profileUpdates.personal.lastName || ''}` : 'Candidate info'}
                {pendingImport.profileUpdates.education?.[0]?.school ? `, ${pendingImport.profileUpdates.education[0].school}` : ''})
              </span>
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setPendingImport(null)}
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check size={13} /> Confirm Import ({pendingImport.entries.length} entries)
            </button>
          </div>
        </div>
      )}

      {/* Search and Category Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge titles, tags, facts..."
            style={{ width: '100%', paddingLeft: '32px', fontSize: '12px', borderRadius: 'var(--radius-full)' }}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ fontSize: '11px', padding: '6px 10px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}
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
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-surface)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--accent-subtle)',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      border: '1px solid rgba(49, 125, 159, 0.2)',
                    }}
                  >
                    {entry.category}
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {entry.title}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setEditingEntry(entry)}
                    title="Edit entry"
                    style={{ padding: '4px', color: 'var(--text-secondary)', borderRadius: 'var(--radius-full)' }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    title="Delete entry"
                    style={{ padding: '4px', color: 'var(--danger)', borderRadius: 'var(--radius-full)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {entry.shortVersion || entry.longVersion.slice(0, 160)}
                {entry.longVersion.length > 160 ? '...' : ''}
              </div>

              {entry.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                  {entry.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
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
