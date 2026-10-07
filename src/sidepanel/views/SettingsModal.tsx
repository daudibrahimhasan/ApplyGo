import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '../../shared/schemas/settings';
import { Storage } from '../../shared/storage';
import { BackupDataSchema } from '../../shared/schemas/settings';
import { parseMarkdownKnowledge } from '../../core/importers/markdownImporter';
import { X, ShieldCheck, Download, Upload, Trash2, Eye, EyeOff, FileText, Key, Check, Sparkles } from 'lucide-react';
import { DEFAULT_GEMINI_MODEL, GEMINI_TEXT_MODELS } from '../../shared/aiModels';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    requestTimeoutMs: 45000,
    autoDetectForms: true,
    showFloatingLauncher: true,
    highlightFilledFields: true,
    fillDelayMs: 40,
    theme: 'system',
  });

  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Markdown import state
  const [pendingMdImport, setPendingMdImport] = useState<ReturnType<typeof parseMarkdownKnowledge> | null>(null);
  const [mdFileName, setMdFileName] = useState('');
  const [mdImportMode, setMdImportMode] = useState<'merge' | 'replace'>('merge');
  const [mdSyncProfile, setMdSyncProfile] = useState(true);
  const [mdSuccessNotice, setMdSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Storage.getSettings().then((loaded) => {
        setSettings(loaded);
        setTestResult(null);
        setImportError(null);
        setMdSuccessNotice(null);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = async () => {
    await Storage.saveSettings(settings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleClearApiKey = async () => {
    const updated = { ...settings, apiKey: '' };
    setSettings(updated);
    await Storage.saveSettings(updated);
    setTestResult(null);
  };

  const applyPreset = (preset: 'google' | 'openai' | 'openrouter' | 'ollama') => {
    if (preset === 'google') {
      setSettings((s) => ({
        ...s,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        model: DEFAULT_GEMINI_MODEL,
      }));
    } else if (preset === 'openai') {
      setSettings((s) => ({ ...s, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' }));
    } else if (preset === 'openrouter') {
      setSettings((s) => ({ ...s, baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' }));
    } else if (preset === 'ollama') {
      setSettings((s) => ({ ...s, baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' }));
    }
  };

  const handleSelectMdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setMdSuccessNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseMarkdownKnowledge(text);
      if (parsed.entries.length === 0) {
        setImportError('No valid knowledge sections found in the selected markdown file.');
        return;
      }
      setMdFileName(file.name);
      setPendingMdImport(parsed);
    } catch (err: any) {
      setImportError(`Failed to read Markdown file: ${err?.message || String(err)}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmMdImport = async () => {
    if (!pendingMdImport) return;

    try {
      await Storage.importKnowledge(pendingMdImport.entries, mdImportMode);
      if (mdSyncProfile && pendingMdImport.profileUpdates) {
        await Storage.updateProfilePartial(pendingMdImport.profileUpdates);
      }
      setMdSuccessNotice(
        `✓ Successfully imported ${pendingMdImport.entries.length} knowledge entries from ${mdFileName}!`
      );
      setPendingMdImport(null);
      onDataChanged();
    } catch (err: any) {
      setImportError(`Failed to save imported entries: ${err?.message || String(err)}`);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await new Promise<{ success: boolean; message: string }>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(
            {
              type: 'TEST_API_KEY_REQUEST',
              payload: {
                apiKey: settings.apiKey,
                baseUrl: settings.baseUrl,
                model: settings.model,
                timeoutMs: settings.requestTimeoutMs,
              },
            },
            (response) => {
              resolve(response || { success: false, message: 'No response from background worker.' });
            }
          );
        } else {
          // Dev / test mock
          setTimeout(() => {
            resolve({
              success: Boolean(settings.apiKey),
              message: settings.apiKey
                ? 'Test successful: connected to OpenAI provider.'
                : 'API key is required to test.',
            });
          }, 800);
        }
      });
      if (res.success) {
        await Storage.saveSettings(settings);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      }
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleExportFullBackup = async () => {
    const profile = await Storage.getProfile();
    const knowledge = await Storage.getKnowledge();
    const previousAnswers = await Storage.getPreviousAnswers();
    const applications = await Storage.getApplications();

    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile,
      knowledge,
      previousAnswers,
      applications,
      settings: {
        baseUrl: settings.baseUrl,
        model: settings.model,
        autoDetectForms: settings.autoDetectForms,
        showFloatingLauncher: settings.showFloatingLauncher,
        highlightFilledFields: settings.highlightFilledFields,
      },
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applygo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = BackupDataSchema.safeParse(parsed);

      if (!validated.success) {
        setImportError(`Invalid backup schema: ${validated.error.issues.map((i) => i.message).join('; ')}`);
        return;
      }

      const data = validated.data;
      if (data.profile) await Storage.saveProfile(data.profile);
      if (data.knowledge) await Storage.saveKnowledge(data.knowledge);
      if (data.previousAnswers) await Storage.savePreviousAnswers(data.previousAnswers);
      if (data.applications) await Storage.saveApplications(data.applications);

      alert('Backup imported successfully!');
      onDataChanged();
      onClose();
    } catch (err: any) {
      setImportError(`Failed to import JSON: ${err.message || String(err)}`);
    }
  };

  const handleWipeAll = async () => {
    const confirm = window.confirm(
      'Are you sure you want to delete all local data? This deletes your profile, knowledge, and settings.'
    );
    if (confirm) {
      await Storage.clearAllData();
      alert('All local data wiped.');
      onDataChanged();
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(12, 15, 13, 0.76)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 16px',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.2px' }}>Settings & Privacy</h2>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                fontWeight: 500,
                border: '1px solid var(--success-border)',
              }}
            >
              Ocean Theme
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            style={{
              padding: '6px',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Security / Secret Storage Note */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
            <ShieldCheck size={15} color="var(--accent-primary)" />
            <span>Local BYOK Security Note</span>
          </div>
          Local extension storage is isolated from web pages and suitable for personal Bring-Your-Own-Key use, but is not equivalent to hardware-backed secret storage (HSM/TPM).
        </div>

        {/* AI Provider Config */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-surface)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={15} color="var(--accent-primary)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>OpenAI-Compatible API Key</span>
            </div>
            {settings.apiKey ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ● Key Configured
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--warning-bg)',
                  border: '1px solid var(--warning-border)',
                  color: 'var(--warning)',
                }}
              >
                ○ No Key Configured
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Required for generating written responses in the Questions tab. Stored locally in your browser and used only by the background service worker.
          </div>

          {/* Quick Presets */}
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 500 }}>
              Provider Presets
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => applyPreset('google')}
                style={{
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  backgroundColor: settings.baseUrl.includes('googleapis.com') ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                  color: settings.baseUrl.includes('googleapis.com') ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                Google Gemini (AI Studio)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('openai')}
                style={{
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  backgroundColor: settings.baseUrl.includes('openai.com') ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                  color: settings.baseUrl.includes('openai.com') ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                OpenAI (gpt-4o)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('openrouter')}
                style={{
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  backgroundColor: settings.baseUrl.includes('openrouter') ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                  color: settings.baseUrl.includes('openrouter') ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                OpenRouter
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ollama')}
                style={{
                  fontSize: '11px',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  backgroundColor: settings.baseUrl.includes('11434') ? 'var(--accent-subtle)' : 'var(--bg-surface-elevated)',
                  color: settings.baseUrl.includes('11434') ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.15s ease',
                }}
              >
                Ollama (Local)
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>API Key</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="Paste API Key (e.g. AIzaSy... or sk-...)"
                style={{ flex: 1, fontSize: '12px' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
                style={{
                  padding: '0 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {settings.apiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  title="Clear API key"
                  style={{
                    padding: '0 12px',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--danger)',
                    backgroundColor: 'var(--danger-bg)',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Model Name</label>
            {settings.baseUrl.includes('generativelanguage.googleapis.com') ? (
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                style={{ width: '100%', fontSize: '12px', marginTop: '4px' }}
              >
                {GEMINI_TEXT_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                placeholder="gpt-4o"
                style={{ width: '100%', fontSize: '12px', marginTop: '4px' }}
              />
            )}
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 500, textDecoration: 'none' }}
            >
              {showAdvanced ? '▾ Hide Advanced Provider Options' : '▸ Show Advanced Options (Base URL, Timeout)'}
            </button>

            {showAdvanced && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base URL</label>
                  <input
                    type="text"
                    value={settings.baseUrl}
                    onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                    style={{ width: '100%', fontSize: '11px', marginTop: '2px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Request Timeout (ms)</label>
                  <input
                    type="number"
                    value={settings.requestTimeoutMs}
                    onChange={(e) => setSettings({ ...settings, requestTimeoutMs: Number(e.target.value) })}
                    style={{ width: '100%', fontSize: '11px', marginTop: '2px' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.apiKey}
              style={{
                flex: 1,
                height: '38px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--bg-surface-elevated)',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                cursor: testingConnection || !settings.apiKey ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              style={{
                flex: 1,
                height: '38px',
                background: savedNotice ? 'var(--success)' : 'var(--accent-gradient)',
                color: '#fff',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(78, 133, 99, 0.25)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {savedNotice ? 'Saved! ✓' : 'Save Settings'}
            </button>
          </div>

          {testResult && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                backgroundColor: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: testResult.success ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`,
                lineHeight: 1.4,
              }}
            >
              {testResult.message}
            </div>
          )}
        </div>

        {/* Dedicated Markdown Knowledge Base (.md) Import Section */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Grounded Knowledge Base (.md)</span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Upload your personal Markdown file (e.g. <code>daud-knowledge-base.md</code>) to ground written responses in your verified experiences and projects.
          </div>

          {/* Interactive Upload Card */}
          <label
            style={{
              border: '1.5px dashed var(--accent-primary)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <Upload size={20} color="var(--accent-primary)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
              Choose Markdown File (.md)
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Parses sections (##), categories, canonical facts, and profile info
            </span>
            <input
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={handleSelectMdFile}
              style={{ display: 'none' }}
            />
          </label>

          {/* Markdown In-Modal Preview & Confirmation */}
          {pendingMdImport && (
            <div
              style={{
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={13} color="var(--accent-primary)" />
                <span>Found {pendingMdImport.entries.length} entries in {mdFileName}</span>
              </div>

              {pendingMdImport.documentTitle && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Document: "{pendingMdImport.documentTitle}"
                </div>
              )}

              {/* Sample list */}
              <div
                style={{
                  maxHeight: '90px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 6px',
                  backgroundColor: 'var(--bg-surface)',
                  fontSize: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                {pendingMdImport.entries.slice(0, 6).map((e, idx) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{idx + 1}. {e.title}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{e.category}</span>
                  </div>
                ))}
                {pendingMdImport.entries.length > 6 && (
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    + {pendingMdImport.entries.length - 6} more sections...
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="modalMdMode"
                    checked={mdImportMode === 'merge'}
                    onChange={() => setMdImportMode('merge')}
                  />
                  Merge with existing
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="modalMdMode"
                    checked={mdImportMode === 'replace'}
                    onChange={() => setMdImportMode('replace')}
                  />
                  Replace all
                </label>
              </div>

              {pendingMdImport.profileUpdates && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={mdSyncProfile}
                    onChange={(e) => setMdSyncProfile(e.target.checked)}
                  />
                  <span>Also update profile with detected details ({pendingMdImport.profileUpdates.personal?.firstName ? `${pendingMdImport.profileUpdates.personal.firstName} ${pendingMdImport.profileUpdates.personal.lastName || ''}` : 'Candidate info'})</span>
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPendingMdImport(null)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMdImport}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={12} /> Confirm Import ({pendingMdImport.entries.length} entries)
                </button>
              </div>
            </div>
          )}

          {mdSuccessNotice && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#15803d',
                border: '1px solid rgba(34, 197, 94, 0.3)',
              }}
            >
              {mdSuccessNotice}
            </div>
          )}
        </div>

        {/* Data Backup & Portability (JSON) */}
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
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Data Backup & Portability (JSON)</span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportFullBackup}
              style={{
                flex: 1,
                height: '36px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
              }}
            >
              <Download size={14} /> Export Backup JSON
            </button>

            <label
              style={{
                flex: 1,
                height: '36px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Upload size={14} /> Import Backup JSON
              <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
            </label>
          </div>


          {importError && (
            <div style={{ fontSize: '11px', color: 'var(--danger)' }}>{importError}</div>
          )}
        </div>

        {/* Danger Zone */}
        <div
          style={{
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: 'auto',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--danger)' }}>Danger Zone</span>
          <button
            onClick={handleWipeAll}
            style={{
              height: '34px',
              border: '1px solid var(--danger-border)',
              backgroundColor: 'transparent',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Trash2 size={14} /> Delete All Extension Data
          </button>
        </div>
      </div>
    </div>
  );
};
