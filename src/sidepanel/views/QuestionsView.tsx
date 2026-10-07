import React, { useState, useEffect } from 'react';
import { DetectedField, PageOpportunity } from '../../shared/schemas/fields';
import { KnowledgeEntry, PreviousAnswer } from '../../shared/schemas/knowledge';
import { UserProfile } from '../../shared/schemas/profile';
import { GenerationRequest } from '../../shared/schemas/generation';
import { retrieveKnowledge, retrievePreviousAnswers, ScoredKnowledgeEntry, RetrievedPreviousAnswer } from '../../core/retrieval/retriever';
import { OutputValidationResult } from '../../core/generation/validator';
import { isWrittenQuestion } from '../../core/matching/workflow';
import { Sparkles, AlertTriangle, Check, RefreshCw, Send, AlertOctagon } from 'lucide-react';

interface QuestionsViewProps {
  fields: DetectedField[];
  opportunity: PageOpportunity | null;
  profile: UserProfile;
  knowledge: KnowledgeEntry[];
  previousAnswers: PreviousAnswer[];
  onInsertAnswer: (field: DetectedField, answerText: string) => Promise<void>;
  onSavePreviousAnswer: (answer: PreviousAnswer) => Promise<void>;
  selectedFieldId?: string;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({
  fields,
  opportunity,
  profile: _profile,
  knowledge,
  previousAnswers,
  onInsertAnswer,
  onSavePreviousAnswer,
  selectedFieldId,
}) => {
  const writtenFields = fields.filter(isWrittenQuestion);

  const [selectedIdState, setSelectedIdState] = useState<string | null>(null);
  const [prevSelectedProp, setPrevSelectedProp] = useState<string | undefined>(selectedFieldId);

  if (selectedFieldId !== prevSelectedProp) {
    setPrevSelectedProp(selectedFieldId);
    setSelectedIdState(selectedFieldId || null);
  }

  const activeFieldId = selectedIdState || selectedFieldId || writtenFields[0]?.id || '';
  const setActiveFieldId = (id: string) => setSelectedIdState(id);

  const activeField = writtenFields.find((f) => f.id === activeFieldId) || writtenFields[0];

  // Retrieved context for active question
  const [retrievedKnowledge, setRetrievedKnowledge] = useState<ScoredKnowledgeEntry[]>([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);
  const [retrievedPreviousAnswers, setRetrievedPreviousAnswers] = useState<RetrievedPreviousAnswer[]>([]);
  const [selectedPreviousAnswerId, setSelectedPreviousAnswerId] = useState<string | undefined>();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDraft, setCurrentDraft] = useState('');
  const [validationResult, setValidationResult] = useState<OutputValidationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [insertSuccess, setInsertSuccess] = useState(false);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);

  // Recalculate retrieval when active field changes
  useEffect(() => {
    if (!activeField) return;
    const questionText = activeField.label || activeField.placeholder || activeField.ariaLabel;
    if (!questionText) return;

    // Wrap in async IIFE to avoid synchronous setState in effect body
    void (async () => {
      const scored = retrieveKnowledge(questionText, knowledge, opportunity?.opportunityType, 5);
      setRetrievedKnowledge(scored);
      setSelectedKnowledgeIds(scored.map((s) => s.entry.id));

      const prev = retrievePreviousAnswers(questionText, previousAnswers);
      setRetrievedPreviousAnswers(prev);
      if (prev.length > 0 && prev[0].isExactMatch) {
        setSelectedPreviousAnswerId(prev[0].answer.id);
      } else {
        setSelectedPreviousAnswerId(undefined);
      }

      // Reset draft and states
      setCurrentDraft(activeField.currentValue || activeField.proposedValue || '');
      setValidationResult(null);
      setGenerationError(null);
      setInsertSuccess(false);
      setOverrideAcknowledged(false);
    })();
  }, [activeField, knowledge, previousAnswers, opportunity?.opportunityType]);

  const handleToggleKnowledge = (id: string) => {
    setSelectedKnowledgeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (mode: GenerationRequest['mode']) => {
    if (!activeField) return;
    const questionText = activeField.label || activeField.placeholder || activeField.ariaLabel;
    if (!questionText) return;

    setIsGenerating(true);
    setGenerationError(null);
    setValidationResult(null);
    setInsertSuccess(false);

    try {
      const request: GenerationRequest = {
        questionId: activeField.id,
        questionText,
        instructions: activeField.nearbyInstructions || activeField.ariaDescription,
        wordLimit: activeField.wordLimit,
        characterLimit: activeField.characterLimit,
        organization: opportunity?.organization,
        opportunity: opportunity?.opportunityName,
        opportunityType: opportunity?.opportunityType,
        selectedKnowledgeIds,
        selectedPreviousAnswerId,
        currentDraft: mode !== 'draft' ? currentDraft : undefined,
        mode,
      };

      const response = await new Promise<OutputValidationResult>((resolve, reject) => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(
            { type: 'GENERATE_ANSWER_REQUEST', payload: request },
            (res) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(res);
              }
            }
          );
        } else {
          // Mock generation for test / dev environment
          setTimeout(() => {
            const mockAnswer = `[Mock response] This is a placeholder draft generated in development mode. In the real extension, this text would be generated by the configured AI model using only your selected knowledge entries as grounding context. Please configure your API key in Settings to enable real generation.`;
            resolve({
              isValid: true,
              data: {
                answer: mockAnswer,
                usedKnowledgeIds: selectedKnowledgeIds.slice(0, 2),
                unsupportedClaims: [],
                missingInformation: [],
                confidence: 'medium',
              },
              errors: [],
              wordCount: mockAnswer.split(/\s+/).length,
              characterCount: mockAnswer.length,
              canInsertDirectly: true,
            });
          }, 800);
        }
      });

      if (!response.isValid) {
        setGenerationError(response.errors.join(' '));
      } else if (response.data) {
        setValidationResult(response);
        setCurrentDraft(response.data.answer);
      }
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to generate answer.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndInsert = async () => {
    if (!activeField || !currentDraft.trim()) return;

    try {
      await onInsertAnswer(activeField, currentDraft);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'The page rejected insertion.');
      return;
    }
    setInsertSuccess(true);

    // Save as previous approved answer
    const questionText = activeField.label || activeField.placeholder || activeField.ariaLabel;
    const newAnswer: PreviousAnswer = {
      id: `ans_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      normalizedQuestion: questionText.toLowerCase().trim(),
      originalQuestion: questionText,
      answer: currentDraft,
      organization: opportunity?.organization,
      opportunity: opportunity?.opportunityName,
      opportunityType: opportunity?.opportunityType,
      knowledgeIds: validationResult?.data?.usedKnowledgeIds || selectedKnowledgeIds,
      approvedByUser: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSavePreviousAnswer(newAnswer);
  };

  if (writtenFields.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>No written or long-form questions detected on this page.</p>
        <p style={{ fontSize: '11px' }}>
          ApplyGo detects textareas and essay prompts. When on an application page, they will appear here for grounded drafting.
        </p>
      </div>
    );
  }

  const wordCount = currentDraft.trim() ? currentDraft.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = currentDraft.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px' }}>
      {/* Question Selector Tabs */}
      {writtenFields.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
          {writtenFields.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActiveFieldId(f.id)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: activeFieldId === f.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                color: activeFieldId === f.id ? '#ffffff' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              Q{i + 1}: {(f.label || f.placeholder || 'Question').slice(0, 20)}...
            </button>
          ))}
        </div>
      )}

      {/* Target Question Card */}
      <div
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
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)' }}>
          Target Written Question
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {activeField?.label || activeField?.placeholder || activeField?.ariaLabel}
        </div>
        {activeField?.nearbyInstructions && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Instructions: {activeField.nearbyInstructions}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
          {activeField?.wordLimit && <span>Word Limit: {activeField.wordLimit}</span>}
          {activeField?.characterLimit && <span>Char Limit: {activeField.characterLimit}</span>}
        </div>
      </div>

      {/* Previous Approved Answer Suggestions */}
      {retrievedPreviousAnswers.length > 0 && (
        <div
          style={{
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--warning)' }}>
              Previous Approved Answer Available ({retrievedPreviousAnswers[0].similarityScore}% Match)
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxHeight: '60px', overflowY: 'auto' }}>
            "{retrievedPreviousAnswers[0].answer.answer.slice(0, 180)}..."
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
            <button
              onClick={() => setCurrentDraft(retrievedPreviousAnswers[0].answer.answer)}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Use directly
            </button>
            <button
              onClick={() => {
                setSelectedPreviousAnswerId(retrievedPreviousAnswers[0].answer.id);
                handleGenerate('adapt');
              }}
              disabled={isGenerating}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid var(--warning-border)',
                color: 'var(--warning)',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Adapt to this opportunity
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Context Selector */}
      <div
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Grounded Knowledge Sources ({selectedKnowledgeIds.length} selected)
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Only selected entries are sent to AI</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
          {retrievedKnowledge.map((item) => {
            const isChecked = selectedKnowledgeIds.includes(item.entry.id);
            return (
              <label
                key={item.entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleKnowledge(item.entry.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 500, color: 'var(--accent-primary)' }}>[{item.entry.category}]</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.entry.title}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action Generation Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button
          onClick={() => handleGenerate('draft')}
          disabled={isGenerating || selectedKnowledgeIds.length === 0}
          style={{
            flex: '1 1 120px',
            height: '38px',
            background: 'var(--accent-gradient)',
            color: '#fff',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(49, 125, 159, 0.25)',
            cursor: isGenerating || selectedKnowledgeIds.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isGenerating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}
          {isGenerating ? 'Drafting...' : 'Generate Answer'}
        </button>

        {currentDraft && (
          <>
            <button
              onClick={() => handleGenerate('shorten')}
              disabled={isGenerating}
              style={{
                padding: '0 12px',
                height: '38px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Shorten
            </button>

            <button
              onClick={() => handleGenerate('expand')}
              disabled={isGenerating}
              style={{
                padding: '0 12px',
                height: '38px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Expand
            </button>

            <button
              onClick={() => handleGenerate('rewrite')}
              disabled={isGenerating}
              style={{
                padding: '0 12px',
                height: '38px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Rewrite
            </button>
          </>
        )}
      </div>

      {generationError && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--danger)',
            fontSize: '11px',
          }}
        >
          {generationError}
        </div>
      )}

      {/* Warnings & Audit Badges */}
      {validationResult?.data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {validationResult.data.unsupportedClaims.length > 0 && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={13} />
              <span>Unsupported claims detected: {validationResult.data.unsupportedClaims.join(', ')}</span>
            </div>
          )}

          {validationResult.data.missingInformation.length > 0 && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                color: 'var(--warning)',
                fontSize: '11px',
              }}
            >
              Missing info noted by model: {validationResult.data.missingInformation.join('; ')}
            </div>
          )}

          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Used Knowledge IDs: {validationResult.data.usedKnowledgeIds.join(', ') || 'None'} • Confidence: {validationResult.data.confidence}
          </div>
        </div>
      )}

      {/* Editable Draft Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Editable Answer Draft</span>
          <span>
            {wordCount} words {activeField?.wordLimit ? `/ max ${activeField.wordLimit}` : ''} • {charCount} chars
          </span>
        </div>

        <textarea
          value={currentDraft}
          onChange={(e) => setCurrentDraft(e.target.value)}
          rows={7}
          placeholder="Answer draft will appear here. You can freely edit and refine before inserting..."
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            fontSize: '12px',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
      </div>

      {/* Safety Gate: warn when canInsertDirectly is false */}
      {validationResult && !validationResult.canInsertDirectly && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, fontSize: '12px' }}>
            <AlertOctagon size={15} />
            <span>This draft may not be safe to insert directly</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'var(--danger)', lineHeight: 1.6 }}>
            {validationResult.data?.confidence === 'low' && <li>Model confidence is low</li>}
            {(validationResult.data?.unsupportedClaims?.length ?? 0) > 0 && (
              <li>Unsupported claims: {validationResult.data!.unsupportedClaims.join(', ')}</li>
            )}
            {(validationResult.data?.missingInformation?.length ?? 0) > 0 && (
              <li>Missing information: {validationResult.data!.missingInformation.join('; ')}</li>
            )}
          </ul>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={overrideAcknowledged}
              onChange={(e) => setOverrideAcknowledged(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            I have reviewed the draft and understand the risks of inserting it
          </label>
        </div>
      )}

      {/* Approve and Insert Button */}
      {currentDraft && (
        <button
          onClick={handleApproveAndInsert}
          disabled={
            !currentDraft.trim() ||
            (validationResult !== null && !validationResult.canInsertDirectly && !overrideAcknowledged)
          }
          style={{
            height: '44px',
            backgroundColor: insertSuccess
              ? 'var(--success)'
              : validationResult && !validationResult.canInsertDirectly
                ? overrideAcknowledged
                  ? 'var(--warning)'
                  : 'var(--bg-surface)'
                : 'var(--accent-primary)',
            background: (!validationResult || validationResult.canInsertDirectly) && !insertSuccess
              ? 'var(--accent-gradient)'
              : undefined,
            color: validationResult && !validationResult.canInsertDirectly && !overrideAcknowledged
              ? 'var(--text-muted)'
              : '#fff',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: validationResult && !validationResult.canInsertDirectly
              ? '1px solid var(--border)'
              : 'none',
            boxShadow: (!validationResult || validationResult.canInsertDirectly) && currentDraft.trim()
              ? '0 4px 14px rgba(49, 125, 159, 0.28)'
              : undefined,
            cursor: (!currentDraft.trim() || (validationResult !== null && !validationResult.canInsertDirectly && !overrideAcknowledged))
              ? 'not-allowed'
              : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {insertSuccess ? <Check size={16} /> : <Send size={15} />}
          {insertSuccess
            ? 'Inserted and Saved!'
            : validationResult && !validationResult.canInsertDirectly
              ? 'Override & Insert (Reviewed)'
              : 'Approve & Insert into Form'}
        </button>
      )}

      {insertSuccess && (
        <div style={{ fontSize: '11px', color: 'var(--success)', textAlign: 'center' }}>
          Answer inserted into active field and saved to your approved answers.
        </div>
      )}
    </div>
  );
};
