import { Storage } from '../shared/storage';
import { AiClient } from './aiClient';
import { ExtensionMessage } from '../shared/contracts/messages';
import { GenerationRequest } from '../shared/schemas/generation';
import { ensureProfileFromKnowledge } from '../core/importers/profileSync';
import { openSidePanelFromLauncher } from './openSidePanel';

// Configure side panel behavior on installation
chrome.runtime.onInstalled.addListener(async () => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (e) {
      console.warn('Could not set sidePanel openPanelOnActionClick behavior:', e);
    }
  }

  // Restrict storage access to trusted contexts (background, side panel, options)
  // so content scripts cannot directly read the API key, profile, or knowledge base.
  if (chrome.storage?.local?.setAccessLevel) {
    try {
      await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    } catch (e) {
      console.warn('Could not set storage access level:', e);
    }
  }

  // Seed default data if storage is fresh
  const profile = await Storage.getProfile();
  if (!profile.personal.firstName) {
    // defaults are handled by Storage fallbacks
  }
});

// Explicit action click handler to guarantee side panel opens on icon click
chrome.action?.onClicked?.addListener(async (tab) => {
  if (chrome.sidePanel?.open && tab.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (e) {
      console.warn('Could not open side panel on action click:', e);
    }
  }
});

// Handle messages from Side Panel and Content Scripts
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'OPEN_SIDE_PANEL_REQUEST': {
      return openSidePanelFromLauncher(sender, sendResponse);
    }

    case 'TEST_API_KEY_REQUEST': {
      const payload = message.payload as {
        apiKey: string;
        baseUrl: string;
        model: string;
        timeoutMs?: number;
      };
      const client = new AiClient({
        apiKey: payload.apiKey,
        baseUrl: payload.baseUrl,
        model: payload.model,
        timeoutMs: payload.timeoutMs,
      });
      client.testConnection().then(sendResponse);
      return true; // Keep channel open for async response
    }

    case 'GENERATE_ANSWER_REQUEST': {
      const request = message.payload as GenerationRequest;
      (async () => {
        const settings = await Storage.getSettings();
        const profile = await Storage.getProfile();
        const allKnowledge = await Storage.getKnowledge();
        const allAnswers = await Storage.getPreviousAnswers();

        const selectedKnowledge = allKnowledge.filter((k) =>
          request.selectedKnowledgeIds.includes(k.id)
        );
        const selectedPreviousAnswer = request.selectedPreviousAnswerId
          ? allAnswers.find((a) => a.id === request.selectedPreviousAnswerId)
          : undefined;

        const client = new AiClient({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          temperature: settings.temperature,
          timeoutMs: settings.requestTimeoutMs,
        });

        const result = await client.generateAnswer({
          request,
          selectedKnowledge,
          selectedPreviousAnswer,
          profile,
        });

        sendResponse(result);
      })();
      return true;
    }

    case 'GET_SETTINGS_REQUEST': {
      Storage.getSettings().then(sendResponse);
      return true;
    }

    case 'GET_PROFILE_FOR_SCAN_REQUEST': {
      ensureProfileFromKnowledge().then(sendResponse);
      return true;
    }

    case 'SAVE_SETTINGS_REQUEST': {
      const payload = message.payload as any;
      Storage.saveSettings(payload).then(() => sendResponse({ success: true }));
      return true;
    }
  }
});
