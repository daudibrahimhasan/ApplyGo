import React, { useState, useEffect } from 'react';
import { ExtensionSettings, BackupDataSchema } from '../shared/schemas/settings';
import { Storage } from '../shared/storage';
import { parseMarkdownKnowledge } from '../core/importers/markdownImporter';
import { ShieldCheck, Download, Upload, Trash2, Eye, EyeOff, Save, Check, FileText } from 'lucide-react';
import '../styles/global.css';
import { DEFAULT_GEMINI_MODEL, GEMINI_TEXT_MODELS } from '../shared/aiModels';

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
                timeoutMs: settings.requestTimeoutMs,
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
      if (res.success) {
        await Storage.saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
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
    a.download = `applygo_backup_${new Date().toISOString().split('T')[0]}.json`;
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

  const handleImportMarkdown = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseMarkdownKnowledge(text);
      if (parsed.entries.length === 0) {
        setImportStatus('No valid knowledge sections found in the markdown file.');
        return;
      }

      await Storage.importKnowledge(parsed.entries, 'merge');
      if (parsed.profileUpdates) {
        await Storage.updateProfilePartial(parsed.profileUpdates);
      }

      setImportStatus(`Successfully imported ${parsed.entries.length} knowledge entries from ${file.name}!`);
    } catch (err: any) {
      setImportStatus(`Failed to import Markdown: ${err.message || String(err)}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleWipeData = async () => {
    if (window.confirm('Delete all stored ApplyGo data? This cannot be undone.')) {
      await Storage.clearAllData();
      alert('All local storage cleared.');
      window.location.reload();
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-surface)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '18px',
            boxShadow: '0 4px 14px rgba(49, 125, 159, 0.28)',
            flexShrink: 0,
          }}
        >
          <img src="/branding/logo.png" alt="ApplyGo logo" width={32} height={32} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.3px' }}>ApplyGo Settings</h1>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                border: '1px solid rgba(49, 125, 159, 0.25)',
              }}
            >
              Ocean Theme
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Personal Bring-Your-Own-Key configuration and data management
          </p>
        </div>
      </div>

      {/* Security notice */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-surface)',
          padding: '14px 16px',
          fontSize: '12px',
          lineHeight: 1.5,
          color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          <ShieldCheck size={16} color="var(--accent-primary)" />
          <span>Local Extension Security</span>
        </div>
        Your API key and candidate data are stored in Chromium local extension storage. They are never exposed to content scripts or external servers. Local extension storage is suitable for personal BYOK use but is not equivalent to hardware-backed secret storage.
      </div>

      {/* API Key Section */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-surface)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>AI Model Provider Setup</h2>

        {/* Quick Presets */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 500 }}>
            Provider Presets
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                  model: DEFAULT_GEMINI_MODEL,
                }))
              }
              style={{
                fontSize: '11px',
                padding: '6px 14px',
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
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  baseUrl: 'https://api.openai.com/v1',
                  model: 'gpt-4o',
                }))
              }
              style={{
                fontSize: '11px',
                padding: '6px 14px',
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
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  baseUrl: 'https://openrouter.ai/api/v1',
                  model: 'anthropic/claude-3.5-sonnet',
                }))
              }
              style={{
                fontSize: '11px',
                padding: '6px 14px',
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
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  baseUrl: 'http://localhost:11434/v1',
                  model: 'llama3.1',
                }))
              }
              style={{
                fontSize: '11px',
                padding: '6px 14px',
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
          {settings.baseUrl.includes('generativelanguage.googleapis.com') ? (
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
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
              style={{ width: '100%', fontSize: '13px', marginTop: '4px' }}
            />
          )}
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
              padding: '0 20px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: testing || !settings.apiKey ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            style={{
              height: '40px',
              padding: '0 24px',
              backgroundColor: saved ? 'var(--success)' : 'var(--accent-primary)',
              background: saved ? undefined : 'var(--accent-gradient)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(49, 125, 159, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        {testResult && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
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
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-surface)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Backup & Data Portability</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Export or import your full candidate profile, grounded knowledge base, and application activity as a local JSON file.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportBackup}
            style={{
              height: '38px',
              padding: '0 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={14} /> Export Backup JSON
          </button>

          <label
            style={{
              height: '38px',
              padding: '0 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-surface-elevated)',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Upload size={14} /> Import Backup JSON
            <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
          </label>

          <label
            style={{
              height: '38px',
              padding: '0 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-subtle)',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <FileText size={14} /> Import Knowledge Base (.md)
            <input type="file" accept=".md,.markdown,text/markdown" onChange={handleImportMarkdown} style={{ display: 'none' }} />
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
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--danger-bg)',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
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
            padding: '0 16px',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            color: 'var(--danger)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Trash2 size={14} /> Delete All Stored Data
        </button>
      </div>
    </div>
  );
};
