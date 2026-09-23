import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../shared/schemas/profile';
import { KnowledgeEntry, PreviousAnswer } from '../shared/schemas/knowledge';
import { DetectedField, PageOpportunity } from '../shared/schemas/fields';
import { ApplicationHistory } from '../shared/schemas/application';
import { Storage } from '../shared/storage';
import { defaultProfile } from '../shared/storage/defaultProfile';
import { defaultKnowledge } from '../shared/storage/defaultKnowledge';
import { Header } from './components/Header';
import { NavTabs, TabId } from './components/NavTabs';
import { ApplyView } from './views/ApplyView';
import { QuestionsView } from './views/QuestionsView';
import { ProfileView } from './views/ProfileView';
import { KnowledgeView } from './views/KnowledgeView';
import { ActivityView } from './views/ActivityView';
import { SettingsModal } from './views/SettingsModal';

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

  // Load initial data from Storage
  const loadStoredData = useCallback(async () => {
    const prof = await Storage.getProfile();
    const know = await Storage.getKnowledge();
    const prev = await Storage.getPreviousAnswers();
    const apps = await Storage.getApplications();

    setProfile(prof);
    setKnowledge(know);
    setPreviousAnswers(prev);
    setApplications(apps);
  }, []);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  // Request page scan from active tab
  const scanActiveTab = useCallback(async () => {
    setIsScanning(true);
    setLastFillMessage(undefined);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.id) {
          setIsScanning(false);
          return;
        }

        chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE_REQUEST' }, (response) => {
          setIsScanning(false);
          if (chrome.runtime.lastError || !response) {
            console.log('Content script not active or page not ready:', chrome.runtime.lastError?.message);
            return;
          }

          setOpportunity(response.opportunity || null);
          setFields(response.fields || []);

          // Record application in history if opportunity detected
          if (response.opportunity?.opportunityName) {
            const historyItem: ApplicationHistory = {
              id: `app_${tab.url ? btoa(tab.url).slice(0, 12) : Date.now()}`,
              organization: response.opportunity.organization || '',
              opportunity: response.opportunity.opportunityName,
              opportunityType: response.opportunity.opportunityType || 'General Application',
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
  }, []);

  useEffect(() => {
    scanActiveTab();
  }, [scanActiveTab]);

  // Autofill all high-confidence safe fields
  const handleFillSafeFields = async () => {
    const safeToFill = fields
      .filter((f) => f.confidence === 'high' && f.sensitivity === 'safe' && f.proposedValue)
      .map((f) => ({ id: f.id, selector: f.selector, value: f.proposedValue! }));

    if (safeToFill.length === 0) return;

    setIsFilling(true);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          setIsFilling(false);
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          { type: 'FILL_FIELDS_REQUEST', payload: { fields: safeToFill } },
          (response) => {
            setIsFilling(false);
            if (response) {
              setCanUndo(true);
              setLastFillMessage(`Safely filled ${response.successCount} field${response.successCount === 1 ? '' : 's'}.`);
              scanActiveTab();
            }
          }
        );
      });
    } else {
      // Mock fill
      setTimeout(() => {
        setIsFilling(false);
        setCanUndo(true);
        setLastFillMessage(`Safely filled ${safeToFill.length} fields.`);
        setFields((prev) =>
          prev.map((f) =>
            safeToFill.some((s) => s.id === f.id)
              ? { ...f, fillState: 'filled', currentValue: f.proposedValue || '' }
              : f
          )
        );
      }, 400);
    }
  };

  // Fill single field
  const handleFillSingle = async (field: DetectedField) => {
    const val = field.proposedValue || '';
    if (!val) return;

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) return;
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: 'FILL_SINGLE_FIELD_REQUEST',
            payload: { fieldId: field.id, selector: field.selector, value: val },
          },
          (res) => {
            if (res?.success) {
              setCanUndo(true);
              scanActiveTab();
            }
          }
        );
      });
    } else {
      setCanUndo(true);
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, fillState: 'filled', currentValue: val } : f))
      );
    }
  };

  // Undo last fill
  const handleUndo = async () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) return;
        chrome.tabs.sendMessage(tab.id, { type: 'UNDO_TRANSACTION_REQUEST' }, (res) => {
          if (res?.success) {
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
          chrome.tabs.sendMessage(tab.id, {
            type: 'HIGHLIGHT_FIELD_REQUEST',
            payload: { selector },
          });
        }
      });
    }
  };

  // Insert AI generated answer into target field
  const handleInsertAnswer = async (field: DetectedField, text: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) return;
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: 'FILL_SINGLE_FIELD_REQUEST',
            payload: { fieldId: field.id, selector: field.selector, value: text },
          },
          () => {
            scanActiveTab();
          }
        );
      });
    } else {
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, currentValue: text, fillState: 'filled' } : f))
      );
    }
  };

  const handleSaveProfile = async (newProfile: UserProfile) => {
    await Storage.saveProfile(newProfile);
    setProfile(newProfile);
  };

  const handleSaveKnowledge = async (entry: KnowledgeEntry) => {
    await Storage.addKnowledgeEntry(entry);
    const updated = await Storage.getKnowledge();
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
  const questionCount = fields.filter(
    (f) => f.inputType === 'textarea' || (f.wordLimit && f.wordLimit > 15)
  ).length;

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
        onRefreshScan={scanActiveTab}
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
          <ProfileView profile={profile} onSaveProfile={handleSaveProfile} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView
            knowledge={knowledge}
            onSaveEntry={handleSaveKnowledge}
            onDeleteEntry={handleDeleteKnowledge}
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
        onDataChanged={loadStoredData}
      />
    </div>
  );
};
