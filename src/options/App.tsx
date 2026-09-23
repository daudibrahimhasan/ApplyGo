import React, { useState, useEffect } from 'react';
import { ExtensionSettings, BackupDataSchema } from '../shared/schemas/settings';
import { Storage } from '../shared/storage';
import { Key, ShieldCheck, Download, Upload, Trash2, Eye, EyeOff, Save, Check } from 'lucide-react';
import '../styles/global.css';

export const OptionsApp: React.FC = () => {
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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    Storage.getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await Storage.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
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
          resolve({
            success: Boolean(settings.apiKey),
            message: settings.apiKey ? 'Connected to OpenAI provider.' : 'API key is missing.',
          });
        }
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test error.' });
    } finally {
      setTesting(false);
    }
  };

  const handleExportBackup = async () => {
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

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = BackupDataSchema.safeParse(parsed);

      if (!validated.success) {
        setImportStatus(`Schema error: ${validated.error.issues.map((i) => i.message).join('; ')}`);
        return;
      }

      const data = validated.data;
      if (data.profile) await Storage.saveProfile(data.profile);
      if (data.knowledge) await Storage.saveKnowledge(data.knowledge);
      if (data.previousAnswers) await Storage.savePreviousAnswers(data.previousAnswers);
      if (data.applications) await Storage.saveApplications(data.applications);

      setImportStatus('Backup restored successfully!');
    } catch (err: any) {
      setImportStatus(`Failed to parse JSON: ${err.message || String(err)}`);
    }
  };

  const handleWipeData = async () => {
    if (window.confirm('Delete all stored GroundedApply data? This cannot be undone.')) {
      await Storage.clearAllData();
      alert('All local storage cleared.');
      window.location.reload();
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '16px',
          }}
        >
          G
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>GroundedApply Settings</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Personal Bring-Your-Own-Key configuration and data management
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          padding: '14px',
          fontSize: '12px',
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span>Local Extension Security</span>
        </div>
        Your API key and candidate data are stored in Chromium local extension storage. They are never exposed to content scripts or external servers. Local extension storage is suitable for personal BYOK use but is not equivalent to hardware-backed secret storage.
      </div>

      {/* API Key Section */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>OpenAI-Compatible Model Setup</h2>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>OpenAI API Key</label>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-..."
              style={{ flex: 1, fontSize: '13px' }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                padding: '0 10px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
              }}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Model Name</label>
          <input
            type="text"
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            placeholder="gpt-4o"
            style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base URL (Advanced)</label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
            style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={handleTestConnection}
            disabled={testing || !settings.apiKey}
            style={{
              height: '40px',
              padding: '0 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            style={{
              height: '40px',
              padding: '0 20px',
              backgroundColor: saved ? 'var(--success)' : 'var(--accent-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        {testResult && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              backgroundColor: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: testResult.success ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${testResult.success ? 'var(--success-border)' : 'var(--danger-border)'}`,
            }}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {/* Backup and Data Portability */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Backup & Data Portability</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Export or import your full candidate profile, grounded knowledge base, and application activity as a local JSON file.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportBackup}
            style={{
              height: '40px',
              padding: '0 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={15} /> Export Backup JSON
          </button>

          <label
            style={{
              height: '40px',
              padding: '0 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Upload size={15} /> Import Backup JSON
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>
        </div>

        {importStatus && (
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>
            {importStatus}
          </div>
        )}
      </div>

      {/* Wipe Data */}
      <div
        style={{
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--danger-bg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger)' }}>Reset Extension</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Wipe all locally stored candidate data, knowledge entries, and configuration from this browser profile.
        </p>
        <button
          onClick={handleWipeData}
          style={{
            alignSelf: 'flex-start',
            height: '36px',
            padding: '0 14px',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Trash2 size={15} /> Delete All Stored Data
        </button>
      </div>
    </div>
  );
};
