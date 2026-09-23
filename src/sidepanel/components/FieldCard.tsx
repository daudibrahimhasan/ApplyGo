import React, { useState } from 'react';
import { DetectedField } from '../../shared/schemas/fields';
import { ConfidenceBadge, FillStateBadge } from './StatusBadge';
import { Check, Copy, Eye, ShieldAlert, Sparkles } from 'lucide-react';

interface FieldCardProps {
  field: DetectedField;
  onFillSingle: (field: DetectedField) => Promise<void>;
  onHighlight: (selector: string) => void;
  onSelectForQuestions?: (field: DetectedField) => void;
}

export const FieldCard: React.FC<FieldCardProps> = ({
  field,
  onFillSingle,
  onHighlight,
  onSelectForQuestions,
}) => {
  const [copied, setCopied] = useState(false);
  const [filling, setFilling] = useState(false);

  const isWrittenQuestion = field.inputType === 'textarea' || (field.wordLimit && field.wordLimit > 15);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const val = field.proposedValue || field.currentValue;
    if (val) {
      navigator.clipboard.writeText(val);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleFill = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFilling(true);
    try {
      await onFillSingle(field);
    } finally {
      setFilling(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-surface)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              {field.label || field.placeholder || field.name || 'Unnamed Field'}
            </span>
            {field.required && (
              <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 700 }} title="Required field">
                *
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Type: <span style={{ fontFamily: 'var(--font-mono)' }}>{field.inputType}</span>
            {field.proposedProfileKey && (
              <span> • Key: <span style={{ fontFamily: 'var(--font-mono)' }}>{field.proposedProfileKey}</span></span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ConfidenceBadge confidence={field.confidence} />
          <FillStateBadge state={field.fillState} />
        </div>
      </div>

      {field.matchReason && (
        <div
          style={{
            fontSize: '11px',
            color: field.sensitivity === 'blocked' ? 'var(--danger)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {field.sensitivity === 'blocked' && <ShieldAlert size={12} />}
          <span>{field.matchReason}</span>
        </div>
      )}

      {/* Proposed or Current Value Preview */}
      <div
        style={{
          fontSize: '12px',
          backgroundColor: 'var(--bg-surface-elevated)',
          padding: '6px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            color: field.proposedValue ? 'var(--text-primary)' : 'var(--text-muted)',
            fontStyle: field.proposedValue ? 'normal' : 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {field.proposedValue
            ? `Proposed: ${field.proposedValue}`
            : field.currentValue
            ? `Current in page: ${field.currentValue}`
            : 'No value available'}
        </span>

        {field.proposedValue && (
          <button
            onClick={handleCopy}
            title="Copy value"
            aria-label="Copy proposed value"
            style={{
              padding: '2px 5px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
        <button
          onClick={() => onHighlight(field.selector)}
          title="Scroll and highlight in page"
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Eye size={12} /> Inspect
        </button>

        {isWrittenQuestion && onSelectForQuestions && (
          <button
            onClick={() => onSelectForQuestions(field)}
            style={{
              fontSize: '11px',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              fontWeight: 500,
            }}
          >
            <Sparkles size={12} /> Draft with AI
          </button>
        )}

        {field.confidence !== 'blocked' && field.proposedValue && (
          <button
            onClick={handleFill}
            disabled={filling || field.fillState === 'filled'}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: field.fillState === 'filled' ? 'var(--bg-surface-elevated)' : 'var(--accent-primary)',
              color: field.fillState === 'filled' ? 'var(--text-muted)' : '#ffffff',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {field.fillState === 'filled' ? 'Filled' : filling ? 'Filling...' : 'Fill Field'}
          </button>
        )}
      </div>
    </div>
  );
};
