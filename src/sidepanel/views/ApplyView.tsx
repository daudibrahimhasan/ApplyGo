import React, { useState } from 'react';
import { DetectedField, PageOpportunity } from '../../shared/schemas/fields';
import { UserProfile } from '../../shared/schemas/profile';
import { FormAnalysisState } from '../../shared/schemas/workflow';
import { isWrittenQuestion } from '../../core/matching/workflow';
import { FieldCard } from '../components/FieldCard';
import { ArrowUpRight, ArrowRight, Check, RefreshCw, Undo2, FileText } from 'lucide-react';

interface ApplyViewProps {
  fields: DetectedField[];
  opportunity: PageOpportunity | null;
  profile: UserProfile;
  onFillSafeFields: (resumeId?: string) => Promise<void>;
  onFillSingle: (field: DetectedField) => Promise<void>;
  onUndo: () => Promise<void>;
  canUndo: boolean;
  onHighlight: (selector: string) => void;
  onGoToQuestions: (field?: DetectedField) => void;
  isFilling: boolean;
  lastFillMessage?: string;
  connectionStatus?: 'connected' | 'restricted' | 'unconnected' | 'idle';
  activeTabUrl?: string;
  onReloadPage?: () => void;
  onOpenProfile: () => void;
  analysis: FormAnalysisState;
  onAnalyze: () => void;
}

export const ApplyView: React.FC<ApplyViewProps> = ({
  fields, opportunity, profile, onFillSafeFields, onFillSingle, onUndo, canUndo,
  onHighlight, onGoToQuestions, isFilling, lastFillMessage,
  connectionStatus = 'connected', onReloadPage, onOpenProfile, analysis, onAnalyze,
}) => {
  const [filter, setFilter] = useState<'all' | 'ready' | 'review'>('all');
  const [resumeId, setResumeId] = useState('');
  const selectedResume = profile.resumes.find((item) => item.id === resumeId) ||
    profile.resumes.find((item) => item.isDefault) || profile.resumes[0];
  const busy = analysis.phase === 'scanning' || analysis.phase === 'analyzing';
  const ready = fields.filter((field) => !field.currentValue && field.sensitivity === 'safe' &&
    field.proposedValue && (analysis.answers[field.id]?.canFill ?? field.confidence === 'high'));
  const review = fields.filter((field) => field.fillState === 'review' ||
    analysis.answers[field.id]?.needsReview);
  const canAttach = Boolean(selectedResume?.dataUrl && fields.some((field) => field.inputType === 'file'));
  const hasWrittenQuestions = fields.some((field) => !field.currentValue && isWrittenQuestion(field));
  const shown = filter === 'ready' ? ready : filter === 'review' ? review : fields;

  if (connectionStatus !== 'connected' || (!busy && fields.length === 0)) {
    const restricted = connectionStatus === 'restricted' || connectionStatus === 'idle';
    const disconnected = connectionStatus === 'unconnected';
    return (
      <div className="ocean-waiting">
        <div className="ocean-horizon" aria-hidden="true">
          <svg viewBox="0 0 320 120" fill="none">
            <path d="M0 78C48 78 61 42 111 42S179 82 224 82s62-28 96-28" stroke="currentColor" strokeWidth="2" />
            <path d="M0 95c54 0 63-27 115-27s65 30 111 30 68-20 94-20" stroke="currentColor" strokeWidth="1" opacity=".55" />
          </svg>
        </div>
        <span className="ocean-kicker">YOUR NEXT APPLICATION</span>
        <h1>{disconnected ? 'Reconnect this page.' : restricted ? 'Open a form. We’ll take it from there.' : 'No form on this page.'}</h1>
        <p>{disconnected
          ? 'Reload the application page so ApplyGo can read its fields.'
          : restricted
          ? 'Go to a job, fellowship, or event application. Your saved details and knowledge will be ready when you get there.'
          : 'Navigate to an application, or scan again once its fields have loaded.'}</p>
        {disconnected && onReloadPage ? (
          <button className="ocean-primary" onClick={onReloadPage}>Reload page <RefreshCw size={16} /></button>
        ) : !restricted ? (
          <button className="ocean-primary" onClick={onAnalyze}>Scan again <RefreshCw size={16} /></button>
        ) : null}
        <div className="ocean-setup-links">
          <button onClick={onOpenProfile}>Check your profile <ArrowUpRight size={15} /></button>
        </div>
        <div className="ocean-local-note">Your profile stays on this device.</div>
      </div>
    );
  }

  return (
    <div className="ocean-apply">
      <div className="ocean-application-title">
        <span className="ocean-kicker">{opportunity?.organization || 'CURRENT APPLICATION'}</span>
        <h1>{opportunity?.opportunityName || 'Application form'}</h1>
        <p>{fields.length} fields on this page</p>
      </div>

      <section className="ocean-workflow" aria-live="polite">
        <div className="ocean-workflow-title">
          {busy ? <RefreshCw size={17} className="spin" /> : <Check size={18} />}
          <h2>{busy ? analysis.phase === 'scanning' ? 'Reading your form' : 'Preparing your answers' : review.length ? 'Ready, with a few things to review' : 'Ready to apply'}</h2>
        </div>
        <p>{busy ? analysis.currentLabel || 'Matching fields with your profile and knowledge.' :
          `Basic details fill automatically, without AI. ${review.length ? `${review.length} fields need your input.` : 'Generate written answers when you’re ready.'}`}</p>
        {busy && analysis.total > 0 && (
          <div className="ocean-progress" role="progressbar" aria-valuemin={0} aria-valuemax={analysis.total} aria-valuenow={analysis.completed}>
            <span style={{ width: `${analysis.completed / analysis.total * 100}%` }} />
          </div>
        )}
        {busy && <span className="ocean-progress-label">{analysis.total ? `${analysis.completed} of ${analysis.total} prepared` : 'Reading labels and instructions…'}</span>}
        {profile.resumes.length > 0 && !busy && (
          <label className="ocean-resume"><FileText size={16} /><span>Resume</span>
            <select aria-label="Resume for this application" value={selectedResume?.id || ''}
              onChange={(event) => setResumeId(event.target.value)}>
              {profile.resumes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}
        <button className="ocean-primary" disabled={busy || isFilling || (!ready.length && !canAttach && !hasWrittenQuestions)}
          onClick={() => onFillSafeFields(selectedResume?.id)}>
          {isFilling ? 'Filling one field at a time…' : busy ? 'Preparing answers…' : 'Generate & Fill'}
          {!busy && !isFilling && <ArrowRight size={18} />}
        </button>
        {!busy && <div className="ocean-workflow-footer">
          <button onClick={onAnalyze}><RefreshCw size={13} /> Rescan form</button>
          {canUndo && <button onClick={onUndo}><Undo2 size={14} /> Undo fill</button>}
          <span>Review before submitting</span>
        </div>}
      </section>

      {lastFillMessage && <div className="ocean-fill-result" role="status"><Check size={16} />{lastFillMessage}</div>}
      {fields.length > 0 && <section className="ocean-fields">
        <div className="ocean-field-filters" aria-label="Filter fields">
          {(['all', 'ready', 'review'] as const).map((mode) => (
            <button key={mode} aria-pressed={filter === mode} onClick={() => setFilter(mode)}>
              {mode === 'all' ? 'All fields' : mode === 'ready' ? 'Ready' : 'Needs review'}
              <span>{mode === 'all' ? fields.length : mode === 'ready' ? ready.length : review.length}</span>
            </button>
          ))}
        </div>
        {shown.map((field) => <FieldCard key={field.id} field={field}
          onFillSingle={onFillSingle} onHighlight={onHighlight}
          onSelectForQuestions={onGoToQuestions} onOpenProfile={onOpenProfile} />)}
        {!shown.length && <p className="ocean-filter-empty">No fields in this view.</p>}
      </section>}
    </div>
  );
};
