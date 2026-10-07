import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProfilePartialUpdate, UserProfile } from '../shared/schemas/profile';
import { KnowledgeEntry, PreviousAnswer } from '../shared/schemas/knowledge';
import { DetectedField, PageOpportunity } from '../shared/schemas/fields';
import { ApplicationHistory } from '../shared/schemas/application';
import { Storage } from '../shared/storage';
import { defaultProfile } from '../shared/storage/defaultProfile';
import { defaultKnowledge } from '../shared/storage/defaultKnowledge';
import { isRestrictedUrl } from '../shared/tabUtils';
import { Header } from './components/Header';
import { NavTabs, TabId } from './components/NavTabs';
import { ApplyView } from './views/ApplyView';
import { QuestionsView } from './views/QuestionsView';
import { ProfileView } from './views/ProfileView';
import { KnowledgeView } from './views/KnowledgeView';
import { ActivityView } from './views/ActivityView';
import { SettingsModal } from './views/SettingsModal';
import { ensureProfileFromKnowledge } from '../core/importers/profileSync';
import { GenerationRequest } from '../shared/schemas/generation';
import { OutputValidationResult } from '../core/generation/validator';
import { retrieveKnowledge, retrievePreviousAnswers } from '../core/retrieval/retriever';
import { isBasicAutofill, isWrittenQuestion } from '../core/matching/workflow';
import { FillResult } from '../content/filler';
import { emptyFormAnalysis, FormAnalysisState, PreparedFieldAnswer } from '../shared/schemas/workflow';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('apply');
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>(defaultKnowledge);
  const [previousAnswers, setPreviousAnswers] = useState<PreviousAnswer[]>([]);
  const [applications, setApplications] = useState<ApplicationHistory[]>([]);

  const [fields, setFields] = useState<DetectedField[]>([]);
  const [opportunity, setOpportunity] = useState<PageOpportunity | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [lastFillMessage, setLastFillMessage] = useState<string | undefined>();
  const [selectedFieldForQuestions, setSelectedFieldForQuestions] = useState<string | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'restricted' | 'unconnected' | 'idle'>('idle');
  const [activeTabUrl, setActiveTabUrl] = useState<string | undefined>();
  const [isDataReady, setIsDataReady] = useState(false);
  const [analysis, setAnalysis] = useState<FormAnalysisState>(emptyFormAnalysis);
  const targetRef = useRef<{ id: number; url?: string; epoch: number }>({ id: -1, epoch: 0 });
  const basicAttempts = useRef(new Set<string>());
  const generationRunning = useRef(false);
  const draftsRef = useRef<Record<string, PreparedFieldAnswer>>({});

  // Load initial data from Storage
  const loadStoredData = useCallback(async () => {
    const prof = await ensureProfileFromKnowledge();
    const know = await Storage.getKnowledge();
    const prev = await Storage.getPreviousAnswers();
    const apps = await Storage.getApplications();

    setProfile(prof);
    setKnowledge(know);
    setPreviousAnswers(prev);
    setApplications(apps);
    setIsDataReady(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStoredData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStoredData]);

  // Helper to record detected opportunity to history
  const recordOpportunityHistory = useCallback((tab: chrome.tabs.Tab, opp: PageOpportunity) => {
    const historyItem: ApplicationHistory = {
      id: `app_${tab.url ? btoa(tab.url).slice(0, 12) : Date.now()}`,
      organization: opp.organization || '',
      opportunity: opp.opportunityName,
      opportunityType: opp.opportunityType || 'General Application',
      url: tab.url || '',
      dateOpened: new Date().toISOString(),
      status: 'draft',
      answersGenerated: 0,
      answersInserted: 0,
      notes: '',
    };
    Storage.recordApplication(historyItem).then(() => {
      Storage.getApplications().then(setApplications);
    });
  }, []);

  // Helper to safely reload active tab
  const handleReloadActiveTab = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.tabs.reload(tab.id);
        }
      });
    }
  }, []);

  // Request page scan from active tab with robust restriction guards and dynamic injection
  const scanActiveTab = useCallback(async () => {
    setIsScanning(true);
    setAnalysis((current) => current.phase === 'idle'
      ? { ...current, phase: 'scanning', message: 'Reading the complete form…' }
      : current);
    setLastFillMessage(undefined);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) {
          setIsScanning(false);
          setConnectionStatus('idle');
          setAnalysis(emptyFormAnalysis);
          return;
        }

        if (targetRef.current.id !== tab.id || targetRef.current.url !== tab.url) {
          targetRef.current = { id: tab.id, url: tab.url, epoch: targetRef.current.epoch + 1 };
          basicAttempts.current.clear();
          draftsRef.current = {};
          setFields([]);
          setAnalysis(emptyFormAnalysis);
        }
        setActiveTabUrl(tab.url);

        // 1. Guard against browser internal pages where content scripts can never run
        if (isRestrictedUrl(tab.url)) {
          setIsScanning(false);
          setConnectionStatus('restricted');
          setAnalysis(emptyFormAnalysis);

          setOpportunity(null);
          setFields([]);
          return;
        }

        // 2. Normal web / file page: send SCAN_PAGE_REQUEST
        chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE_REQUEST' }, async (response) => {
          const lastError = chrome.runtime.lastError;
          if (targetRef.current.id !== tab.id || targetRef.current.url !== tab.url) return;

          if (lastError || !response) {
            // Attempt dynamic script injection if tab was open before extension was installed/reloaded
            const manifest = chrome.runtime.getManifest ? chrome.runtime.getManifest() : null;
            const contentScripts = manifest?.content_scripts?.[0]?.js;

            if (chrome.scripting && tab.id && contentScripts && contentScripts.length > 0) {
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  files: contentScripts,
                });

                // Wait a brief moment for DOM script initialization and retry once
                setTimeout(() => {
                  if (!tab.id) return;
                  chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE_REQUEST' }, (retryRes) => {
                    const retryErr = chrome.runtime.lastError;
                    if (targetRef.current.id !== tab.id || targetRef.current.url !== tab.url) return;
                    setIsScanning(false);

                    if (retryErr || !retryRes) {
                      setConnectionStatus('unconnected');
                      setAnalysis(emptyFormAnalysis);
                      setOpportunity(null);
                      setFields([]);
                      return;
                    }

                    setConnectionStatus('connected');
                    setOpportunity(retryRes.opportunity || null);
                    setFields((retryRes.fields || []).map((field: DetectedField) => {
                      const draft = draftsRef.current[field.id];
                      return draft && !field.currentValue ? { ...field, proposedValue: draft.value || undefined,
                        confidence: draft.canFill ? 'high' : 'low', fillState: draft.canFill ? 'matched' : 'review',
                        matchReason: draft.error || 'Prepared written answer.' } : field;
                    }));
                    setAnalysis(emptyFormAnalysis);

                    if (retryRes.opportunity?.opportunityName) {
                      recordOpportunityHistory(tab, retryRes.opportunity);
                    }
                  });
                }, 80);
                return;
              } catch {
                // Scripting not permitted on this tab
              }
            }

            setIsScanning(false);
            setConnectionStatus('unconnected');
            setAnalysis(emptyFormAnalysis);
            setOpportunity(null);
            setFields([]);
            return;
          }

          setIsScanning(false);
          setConnectionStatus('connected');
          setOpportunity(response.opportunity || null);
          setFields((response.fields || []).map((field: DetectedField) => {
            const draft = draftsRef.current[field.id];
            return draft && !field.currentValue ? { ...field, proposedValue: draft.value || undefined,
              confidence: draft.canFill ? 'high' : 'low', fillState: draft.canFill ? 'matched' : 'review',
              matchReason: draft.error || 'Prepared written answer.' } : field;
          }));
          setAnalysis(emptyFormAnalysis);

          if (response.opportunity?.opportunityName) {
            recordOpportunityHistory(tab, response.opportunity);
          }
        });
      });
    } else {
      // Dev / Test mock state
      setTimeout(() => {
        setIsScanning(false);
        setOpportunity({
          organization: 'Conjecture AI Safety',
          opportunityName: 'Research Fellow - Mechanistic Interpretability & Verification',
          opportunityType: 'Research Fellowship',
          url: 'https://example.com/apply',
          detectedPlatform: 'standard',
        });
        setFields([
          {
            id: 'field_first_name',
            selector: 'input#first_name',
            inputType: 'text',
            label: 'First Name',
            placeholder: 'e.g. Alex',
            name: 'firstName',
            domId: 'first_name',
            ariaLabel: '',
            ariaDescription: '',
            nearbyInstructions: '',
            sectionHeading: 'Personal Details',
            options: [],
            required: true,
            currentValue: '',
            visibility: true,
            disabled: false,
            sensitivity: 'safe',
            proposedProfileKey: 'personal.firstName',
            proposedValue: 'Daud',
            matchReason: 'Exact normalized label match',
            confidence: 'high',
            fillState: 'matched',
          },
          {
            id: 'field_last_name',
            selector: 'input#last_name',
            inputType: 'text',
            label: 'Last Name',
            placeholder: 'e.g. Smith',
            name: 'lastName',
            domId: 'last_name',
            ariaLabel: '',
            ariaDescription: '',
            nearbyInstructions: '',
            sectionHeading: 'Personal Details',
            options: [],
            required: true,
            currentValue: '',
            visibility: true,
            disabled: false,
            sensitivity: 'safe',
            proposedProfileKey: 'personal.lastName',
            proposedValue: 'Rahman',
            matchReason: 'Exact normalized label match',
            confidence: 'high',
            fillState: 'matched',
          },
          {
            id: 'field_email',
            selector: 'input#email',
            inputType: 'email',
            label: 'Email Address',
            placeholder: 'name@example.com',
            name: 'email',
            domId: 'email',
            ariaLabel: '',
            ariaDescription: '',
            nearbyInstructions: '',
            sectionHeading: 'Contact Info',
            options: [],
            required: true,
            currentValue: '',
            visibility: true,
            disabled: false,
            sensitivity: 'safe',
            proposedProfileKey: 'personal.email',
            proposedValue: 'daud.rahman@example.com',
            matchReason: 'Exact normalized label match, input type email',
            confidence: 'high',
            fillState: 'matched',
          },
          {
            id: 'field_essay',
            selector: 'textarea#essay',
            inputType: 'textarea',
            label: 'Describe a technical challenge you encountered while verifying agentic systems and how you addressed it.',
            placeholder: 'Share your methodology...',
            name: 'essay',
            domId: 'essay',
            ariaLabel: '',
            ariaDescription: '',
            nearbyInstructions: 'Please stay under 250 words.',
            sectionHeading: 'Technical Questions',
            options: [],
            required: true,
            currentValue: '',
            wordLimit: 250,
            visibility: true,
            disabled: false,
            sensitivity: 'safe',
            confidence: 'low',
            fillState: 'unfilled',
          },
        ]);
      }, 500);
    }
  }, [recordOpportunityHistory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void scanActiveTab();
    }, 0);
    return () => clearTimeout(timer);
  }, [scanActiveTab]);

  const requestGeneratedAnswer = useCallback((request: GenerationRequest) => {
    return new Promise<OutputValidationResult>((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        reject(new Error('The extension background worker is unavailable.'));
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'GENERATE_ANSWER_REQUEST', payload: request },
        (response: OutputValidationResult | undefined) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error('The AI provider returned no response.'));
          } else {
            resolve(response);
          }
        }
      );
    });
  }, []);

  const analyzeCompleteForm = useCallback(async () => {
    if (!isDataReady || fields.length === 0) return;

    const target = targetRef.current;
    const actionable = fields.filter((field) => isWrittenQuestion(field) && !field.currentValue);
    const prepared: Record<string, PreparedFieldAnswer> = {};
    let completed = 0;
    let failed = 0;

    setAnalysis({
      phase: 'analyzing',
      completed: 0,
      total: actionable.length,
      currentLabel: actionable[0]?.label,
      answers: {},
      message: 'Matching profile details and preparing written answers…',
    });

    for (const field of actionable) {
      if (targetRef.current.epoch !== target.epoch) return;
      const label = field.label || field.placeholder || field.ariaLabel || field.name || 'Unnamed field';
      let answer: PreparedFieldAnswer;

      {
        const questionText = label;
        const exactPrevious = retrievePreviousAnswers(questionText, previousAnswers)
          .find((item) => item.isExactMatch);

        if (exactPrevious) {
          answer = {
            fieldId: field.id,
            value: exactPrevious.answer.answer,
            source: 'previous-answer',
            canFill: true,
            needsReview: false,
          };
        } else {
          const selectedKnowledge = retrieveKnowledge(
            questionText,
            knowledge,
            opportunity?.opportunityType,
            5
          );
          const optionInstruction = field.options.length > 0
            ? `Choose exactly one of these options and return its visible label: ${field.options.map((item) => item.label).join(' | ')}`
            : '';
          const instructions = [field.nearbyInstructions || field.ariaDescription, optionInstruction]
            .filter(Boolean)
            .join('\n');

          try {
            const response = await requestGeneratedAnswer({
              questionId: field.id,
              questionText,
              instructions: instructions || undefined,
              wordLimit: field.wordLimit,
              characterLimit: field.characterLimit,
              organization: opportunity?.organization,
              opportunity: opportunity?.opportunityName,
              opportunityType: opportunity?.opportunityType,
              selectedKnowledgeIds: selectedKnowledge.map((item) => item.entry.id),
              mode: 'draft',
            });

            const generated = response.data?.answer?.trim() || '';
            const canFill = Boolean(response.isValid && generated && response.canInsertDirectly);
            answer = {
              fieldId: field.id,
              value: generated,
              source: 'ai',
              canFill,
              needsReview: !canFill,
              error: canFill ? undefined : response.errors.join(' ') || 'The generated answer needs review.',
            };
          } catch (error) {
            answer = {
              fieldId: field.id,
              value: '',
              source: 'ai',
              canFill: false,
              needsReview: true,
              error: error instanceof Error ? error.message : 'Answer generation failed.',
            };
          }
        }
      }

      if (targetRef.current.epoch !== target.epoch) return;
      prepared[field.id] = answer;
      draftsRef.current[field.id] = answer;
      completed += 1;
      if (answer.error) failed += 1;
      setAnalysis({
        phase: 'analyzing',
        completed,
        total: actionable.length,
        currentLabel: actionable[completed]?.label,
        answers: { ...prepared },
        message: `Prepared ${completed} of ${actionable.length} fields`,
      });
    }

    setFields((current) => current.map((field) => {
      const preparedAnswer = prepared[field.id];
      if (!preparedAnswer) return field;
      if (!preparedAnswer.value || !preparedAnswer.canFill) {
        return preparedAnswer.needsReview
          ? {
              ...field,
              proposedValue: preparedAnswer.value || undefined,
              confidence: 'low',
              fillState: 'review',
              matchReason: preparedAnswer.error || 'This field needs review.',
            }
          : field;
      }
      return {
        ...field,
        proposedValue: preparedAnswer.value,
        confidence: 'high',
        fillState: 'matched',
        matchReason: preparedAnswer.source === 'ai'
          ? 'Prepared from grounded knowledge with AI.'
          : `Prepared from ${preparedAnswer.source.replace('-', ' ')}.`,
      };
    }));

    setAnalysis({
      phase: failed > 0 ? 'partial' : 'ready',
      completed,
      total: actionable.length,
      answers: prepared,
      message: failed > 0
        ? `${completed - failed} fields are ready. ${failed} need review.`
        : `All ${completed} fields are ready to apply.`,
    });
    return prepared;
  }, [fields, isDataReady, knowledge, opportunity, previousAnswers, requestGeneratedAnswer]);

  // Stage one is entirely local. Attempt each blank basic field once per page/value.
  useEffect(() => {
    if (isScanning || !isDataReady || isFilling || generationRunning.current ||
        connectionStatus !== 'connected') return;
    const target = targetRef.current;
    const basic = fields.filter(isBasicAutofill).filter((field) =>
      !basicAttempts.current.has(`${field.selector}|${field.proposedValue}`));
    if (!basic.length || target.id < 0) return;
    basic.forEach((field) => basicAttempts.current.add(`${field.selector}|${field.proposedValue}`));
    void (async () => {
      setIsFilling(true);
      try {
        const settings = await Storage.getSettings();
        if (targetRef.current.epoch !== target.epoch) return;
        const result = await chrome.tabs.sendMessage(target.id, {
          type: 'FILL_FIELDS_REQUEST',
          payload: { fields: basic.map((field) => ({
            id: field.id, selector: field.selector, value: field.proposedValue!,
          })), fillDelayMs: settings.fillDelayMs, expectedUrl: target.url },
        }) as FillResult;
        if (targetRef.current.epoch !== target.epoch) return;
        setFields((current) => current.map((field) => {
          const entry = result.transaction.entries.find((item) => item.fieldId === field.id);
          return !entry ? field : entry.success
            ? { ...field, currentValue: entry.filledValue, fillState: 'filled' }
            : { ...field, fillState: 'review', matchReason: 'The page did not accept this value. Review it manually.' };
        }));
        setCanUndo(result.successCount > 0);
        setLastFillMessage(`Filled ${result.successCount} basic details without AI.${result.failureCount ? ` ${result.failureCount} could not be filled.` : ''}`);
      } catch (error) {
        setLastFillMessage(error instanceof Error ? error.message : 'Basic autofill failed. Rescan to retry.');
      } finally {
        setIsFilling(false);
      }
    })();
  }, [fields, isScanning, isDataReady, isFilling, connectionStatus]);

  // Automatically re-scan when active tab changes or finishes navigating
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    const onActivated = () => {
      void scanActiveTab();
    };

    const onUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (_tabId === targetRef.current.id && changeInfo.status === 'complete') {
        void scanActiveTab();
      }
    };

    chrome.tabs.onActivated?.addListener(onActivated);
    chrome.tabs.onUpdated?.addListener(onUpdated);

    return () => {
      chrome.tabs.onActivated?.removeListener(onActivated);
      chrome.tabs.onUpdated?.removeListener(onUpdated);
    };
  }, [scanActiveTab]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
    const onFormChanged = (message: { type?: string }, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'FORM_CHANGED' && sender.tab?.id === targetRef.current.id &&
          !generationRunning.current && !isFilling && !isScanning) void scanActiveTab();
    };
    chrome.runtime.onMessage.addListener(onFormChanged);
    return () => chrome.runtime.onMessage.removeListener(onFormChanged);
  }, [scanActiveTab, isFilling, isScanning]);

  // Stage two is an explicit action. Generate first, then fill sequentially in the captured tab.
  const handleFillSafeFields = async (resumeId?: string) => {
    if (generationRunning.current || isFilling || isScanning) return;
    generationRunning.current = true;
    const target = targetRef.current;
    const snapshot = fields;
    try {
      const prepared = await analyzeCompleteForm();
      if (!prepared || targetRef.current.epoch !== target.epoch) return;
      const safeToFill = snapshot.filter((field) => !field.currentValue && field.sensitivity === 'safe')
        .flatMap((field) => {
          const answer = prepared[field.id];
          const value = answer?.canFill ? answer.value :
            !answer && field.proposedValue && field.confidence === 'high' ? field.proposedValue : '';
          return value ? [{ id: field.id, selector: field.selector, value }] : [];
        });
      const resume = profile.resumes.find((item) => item.id === resumeId) ||
        profile.resumes.find((item) => item.isDefault) || profile.resumes[0];
      const fileField = snapshot.find((field) => field.inputType === 'file' && !field.currentValue);
      const resumePayload = resume?.dataUrl && fileField
        ? { selector: fileField.selector, name: resume.name, fileType: resume.fileType, dataUrl: resume.dataUrl }
        : undefined;
      if (!safeToFill.length && !resumePayload) {
        setLastFillMessage('No answers could be filled. Check the review fields for the reason.');
        return;
      }
      setIsFilling(true);
      const settings = await Storage.getSettings();
      if (targetRef.current.epoch !== target.epoch) return;
      const result = await chrome.tabs.sendMessage(target.id, {
        type: 'FILL_FIELDS_REQUEST',
        payload: { fields: safeToFill, resume: resumePayload, fillDelayMs: settings.fillDelayMs, expectedUrl: target.url },
      }) as FillResult;
      if (targetRef.current.epoch !== target.epoch) return;
      setFields((current) => current.map((field) => {
        const entry = result.transaction.entries.find((item) => item.fieldId === field.id);
        return !entry ? field : entry.success
          ? { ...field, currentValue: entry.filledValue, fillState: 'filled' }
          : { ...field, fillState: 'review', matchReason: 'The page rejected insertion. Your draft is still available.' };
      }));
      setCanUndo(result.successCount > 0);
      setLastFillMessage(`Filled ${result.successCount} fields.${result.failureCount ? ` ${result.failureCount} insertions failed.` : ''} Review before submitting.`);
    } catch (error) {
      setLastFillMessage(error instanceof Error ? error.message : 'Generate & Fill failed.');
    } finally {
      generationRunning.current = false;
      setIsFilling(false);
    }
  };

  // Individual insertion uses the same verified, undoable engine as bulk fill.
  const handleFillSingle = async (field: DetectedField) => {
    if (!field.proposedValue) return;
    try {
      await handleInsertAnswer(field, field.proposedValue);
    } catch (error) {
      setLastFillMessage(error instanceof Error ? error.message : 'Insertion failed.');
    }
  };

  // Undo last fill
  const handleUndo = async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) return;
        chrome.tabs.sendMessage(tab.id, { type: 'UNDO_TRANSACTION_REQUEST' }, (res) => {
          const _err = chrome.runtime.lastError;
          if (!_err && res?.success) {
            setLastFillMessage(res.message);
            setCanUndo(false);
            scanActiveTab();
          }
        });
      });
    } else {
      setCanUndo(false);
      setLastFillMessage('Restored previous field values.');
      setFields((prev) =>
        prev.map((f) => (f.fillState === 'filled' ? { ...f, fillState: 'matched', currentValue: '' } : f))
      );
    }
  };

  // Highlight field in DOM
  const handleHighlight = (selector: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.tabs.sendMessage(
            tab.id,
            {
              type: 'HIGHLIGHT_FIELD_REQUEST',
              payload: { selector },
            },
            () => {
              void chrome.runtime.lastError;
            }
          );
        }
      });
    }
  };

  // Report success only after the page confirms it retained the value.
  const handleInsertAnswer = async (field: DetectedField, text: string) => {
    const target = targetRef.current;
    if (target.id < 0) throw new Error('Open an application page first.');
    const result = await chrome.tabs.sendMessage(target.id, {
      type: 'FILL_FIELDS_REQUEST',
      payload: { fields: [{ id: field.id, selector: field.selector, value: text }], expectedUrl: target.url },
    }) as FillResult;
    if (targetRef.current.epoch !== target.epoch) throw new Error('The active page changed. Rescan the form.');
    if (!result?.successCount) throw new Error('The page rejected insertion or already contains a value. Your draft has been kept.');
    setCanUndo(true);
    setFields((current) => current.map((item) =>
      item.id === field.id ? { ...item, currentValue: text, fillState: 'filled' } : item));
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    await Storage.saveProfile(newProfile);
    setProfile(newProfile);
    await scanActiveTab();
  };

  const handleApplyProfileUpdates = async (updates: ProfilePartialUpdate) => {
    const updated = await Storage.updateProfilePartial(updates);
    setProfile(updated);
    await scanActiveTab();
  };

  const handleSaveKnowledge = async (entry: KnowledgeEntry) => {
    await Storage.addKnowledgeEntry(entry);
    const updated = await Storage.getKnowledge();
    setKnowledge(updated);
  };

  const handleImportKnowledge = async (entries: KnowledgeEntry[], mode: 'merge' | 'replace') => {
    const updated = await Storage.importKnowledge(entries, mode);
    setKnowledge(updated);
  };

  const handleDeleteKnowledge = async (id: string) => {
    await Storage.deleteKnowledgeEntry(id);
    const updated = await Storage.getKnowledge();
    setKnowledge(updated);
  };

  const handleSavePreviousAnswer = async (answer: PreviousAnswer) => {
    await Storage.addPreviousAnswer(answer);
    const updated = await Storage.getPreviousAnswers();
    setPreviousAnswers(updated);
  };

  const handleUpdateApplication = async (app: ApplicationHistory) => {
    await Storage.recordApplication(app);
    const updated = await Storage.getApplications();
    setApplications(updated);
  };

  const unresolvedCount = fields.filter((f) => f.confidence === 'medium' || f.fillState === 'review').length;
  const questionCount = fields.filter(isWrittenQuestion).length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      <Header
        opportunity={opportunity}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshScan={() => { basicAttempts.current.clear(); void scanActiveTab(); }}
        isScanning={isScanning}
      />

      <NavTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        questionCount={questionCount}
        unresolvedCount={unresolvedCount}
      />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'apply' && (
          <ApplyView
            fields={fields}
            opportunity={opportunity}
            profile={profile}
            onFillSafeFields={handleFillSafeFields}
            onFillSingle={handleFillSingle}
            onUndo={handleUndo}
            canUndo={canUndo}
            onHighlight={handleHighlight}
            onGoToQuestions={(field) => {
              if (field) setSelectedFieldForQuestions(field.id);
              setActiveTab('questions');
            }}
            isFilling={isFilling}
            lastFillMessage={lastFillMessage}
            connectionStatus={connectionStatus}
            activeTabUrl={activeTabUrl}
            onReloadPage={handleReloadActiveTab}
            onOpenProfile={() => setActiveTab('profile')}
            analysis={analysis}
            onAnalyze={() => {
              basicAttempts.current.clear();
              void scanActiveTab();
            }}
          />
        )}

        {activeTab === 'questions' && (
          <QuestionsView
            fields={fields}
            opportunity={opportunity}
            profile={profile}
            knowledge={knowledge}
            previousAnswers={previousAnswers}
            onInsertAnswer={handleInsertAnswer}
            onSavePreviousAnswer={handleSavePreviousAnswer}
            selectedFieldId={selectedFieldForQuestions}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView key={profile.updatedAt} profile={profile} onSaveProfile={handleSaveProfile} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView
            knowledge={knowledge}
            onSaveEntry={handleSaveKnowledge}
            onDeleteEntry={handleDeleteKnowledge}
            onImportKnowledge={handleImportKnowledge}
            onApplyProfileUpdates={handleApplyProfileUpdates}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityView
            applications={applications}
            onUpdateApplication={handleUpdateApplication}
          />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChanged={() => {
          void loadStoredData().then(() => scanActiveTab());
        }}
      />
    </div>
  );
};
