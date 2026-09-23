import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '../../shared/schemas/settings';
import { Storage } from '../../shared/storage';
import { BackupDataSchema } from '../../shared/schemas/settings';
import { X, Key, Check, AlertTriangle, ShieldCheck, Download, Upload, Trash2, Eye, EyeOff } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      Storage.getSettings().then(setSettings);
      setTestResult(null);
      setImportError(null);
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
    a.download = `grounded_apply_backup_${new Date().toISOString().split('T')[0]}.json`;
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          padding: '16px',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Settings & Privacy</h2>
          <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Security / Secret Storage Note */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '2px' }}>
            <ShieldCheck size={14} color="var(--success)" />
            <span>Local BYOK Security Note</span>
          </div>
          Local extension storage is isolated from web pages and suitable for personal Bring-Your-Own-Key use, but is not equivalent to hardware-backed secret storage (HSM/TPM).
        </div>

        {/* AI Provider Config */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600 }}>OpenAI-Compatible AI Provider</span>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>API Key</label>
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="sk-..."
                style={{ flex: 1, fontSize: '12px' }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{
                  padding: '0 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                }}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {settings.apiKey && (
                <button
                  onClick={handleClearApiKey}
                  title="Clear API key"
                  style={{
                    padding: '0 8px',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--danger)',
                    fontSize: '11px',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Model</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="gpt-4o"
              style={{ width: '100%', fontSize: '12px', marginTop: '2px' }}
            />
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ fontSize: '11px', color: 'var(--accent-primary)', textDecoration: 'underline' }}
            >
              {showAdvanced ? 'Hide Advanced Provider Options' : 'Show Advanced (Base URL, Timeout)'}
            </button>

            {showAdvanced && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base URL</label>
                  <input
                    type="text"
                    value={settings.baseUrl}
                    onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Request Timeout (ms)</label>
                  <input
                    type="number"
                    value={settings.requestTimeoutMs}
                    onChange={(e) => setSettings({ ...settings, requestTimeoutMs: Number(e.target.value) })}
                    style={{ width: '100%', fontSize: '11px' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.apiKey}
              style={{
                flex: 1,
                height: '34px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              onClick={handleSaveSettings}
              style={{
                flex: 1,
                height: '34px',
                backgroundColor: savedNotice ? 'var(--success)' : 'var(--accent-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              {savedNotice ? 'Saved!' : 'Save Settings'}
            </button>
          </div>

          {testResult && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                backgroundColor: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: testResult.success ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`,
              }}
            >
              {testResult.message}
            </div>
          )}
        </div>

        {/* Data Import & Export */}
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
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Data Backup & Portability</span>

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
