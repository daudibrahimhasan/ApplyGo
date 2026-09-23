import React, { useState } from 'react';
import { DetectedField, PageOpportunity } from '../../shared/schemas/fields';
import { UserProfile, ResumeRecord } from '../../shared/schemas/profile';
import { FieldCard } from '../components/FieldCard';
import { CheckCircle2, AlertCircle, ShieldAlert, Undo2, Sparkles, FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface ApplyViewProps {
  fields: DetectedField[];
  opportunity: PageOpportunity | null;
  profile: UserProfile;
  onFillSafeFields: () => Promise<void>;
  onFillSingle: (field: DetectedField) => Promise<void>;
  onUndo: () => Promise<void>;
  canUndo: boolean;
  onHighlight: (selector: string) => void;
  onGoToQuestions: (field?: DetectedField) => void;
  isFilling: boolean;
  lastFillMessage?: string;
}

export const ApplyView: React.FC<ApplyViewProps> = ({
  fields,
  opportunity,
  profile,
  onFillSafeFields,
  onFillSingle,
  onUndo,
  canUndo,
  onHighlight,
  onGoToQuestions,
  isFilling,
  lastFillMessage,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'safe' | 'review' | 'questions'>('all');
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    profile.resumes.find((r) => r.isDefault)?.id || profile.resumes[0]?.id || ''
  );

  const safeFields = fields.filter(
    (f) => f.confidence === 'high' && f.sensitivity === 'safe' && f.proposedValue
  );
  const reviewFields = fields.filter(
    (f) => f.confidence === 'medium' || (f.confidence === 'low' && f.proposedProfileKey)
  );
  const questionFields = fields.filter(
    (f) => f.inputType === 'textarea' || (f.wordLimit && f.wordLimit > 15)
  );
  const blockedFields = fields.filter((f) => f.sensitivity === 'blocked');

  const selectedResume = profile.resumes.find((r) => r.id === selectedResumeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px' }}>
      {/* Opportunity Overview Banner */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              Detected Target
            </span>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              {opportunity?.opportunityName || 'Application Page'}
            </div>
            {opportunity?.organization && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {opportunity.organization}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {opportunity?.detectedPlatform || 'standard'}
          </span>
        </div>

        {/* Resume Selector */}
        {profile.resumes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <FileText size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resume:</span>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: 'var(--bg-surface-elevated)',
                flex: 1,
              }}
            >
              {profile.resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
        }}
      >
        <div
          onClick={() => setFilterMode('all')}
          style={{
            border: `1px solid ${filterMode === 'all' ? 'var(--accent-primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {fields.length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Detected</div>
        </div>

        <div
          onClick={() => setFilterMode('safe')}
          style={{
            border: `1px solid ${filterMode === 'safe' ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
            {safeFields.length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Safe Match</div>
        </div>

        <div
          onClick={() => setFilterMode('review')}
          style={{
            border: `1px solid ${filterMode === 'review' ? 'var(--warning)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning)' }}>
            {reviewFields.length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Review</div>
        </div>

        <div
          onClick={() => setFilterMode('questions')}
          style={{
            border: `1px solid ${filterMode === 'questions' ? 'var(--accent-primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            padding: '8px 4px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {questionFields.length}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Written Qs</div>
        </div>
      </div>

      {/* Primary Actions Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={onFillSafeFields}
          disabled={isFilling || safeFields.length === 0}
          style={{
            height: '44px', // 44px accessible target
            backgroundColor: safeFields.length > 0 ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
            color: safeFields.length > 0 ? '#ffffff' : 'var(--text-muted)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <CheckCircle2 size={16} />
          {isFilling
            ? 'Filling safe fields...'
            : safeFields.length > 0
            ? `Fill safe fields (${safeFields.length})`
            : 'No high-confidence fields to fill'}
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterMode(filterMode === 'review' ? 'all' : 'review')}
            style={{
              flex: 1,
              height: '36px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} color="var(--warning)" />
            Review matches ({reviewFields.length})
          </button>

          {canUndo && (
            <button
              onClick={onUndo}
              style={{
                height: '36px',
                padding: '0 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Undo2 size={14} /> Undo fill
            </button>
          )}
        </div>
      </div>

      {lastFillMessage && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            fontSize: '12px',
          }}
        >
          {lastFillMessage}
        </div>
      )}

      {/* Field List Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            {filterMode === 'all'
              ? `All Detected Fields (${fields.length})`
              : filterMode === 'safe'
              ? `Safe Fields (${safeFields.length})`
              : filterMode === 'review'
              ? `Fields Requiring Review (${reviewFields.length})`
              : `Written Questions (${questionFields.length})`}
          </span>
          {filterMode !== 'all' && (
            <button
              onClick={() => setFilterMode('all')}
              style={{ fontSize: '11px', color: 'var(--accent-primary)' }}
            >
              Show all
            </button>
          )}
        </div>

        {fields.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}
          >
            No form fields detected on this page yet. Click the refresh button above or navigate to an application page.
          </div>
        ) : (
          (filterMode === 'all'
            ? fields
            : filterMode === 'safe'
            ? safeFields
            : filterMode === 'review'
            ? reviewFields
            : questionFields
          ).map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              onFillSingle={onFillSingle}
              onHighlight={onHighlight}
              onSelectForQuestions={onGoToQuestions}
            />
          ))
        )}
      </div>

      {/* Blocked Sensitive Fields Accordion / Disclaimer */}
      {blockedFields.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, fontSize: '12px' }}>
            <ShieldAlert size={14} />
            <span>Sensitive & Blocked Fields Protected ({blockedFields.length})</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Passwords, payment cards, national IDs, and legal consent checkboxes are automatically blocked from autofill.
          </p>
        </div>
      )}
    </div>
  );
};
