import { scanPageForFields } from './scanner';
import { fillFields, fillSingleElement } from './filler';
import { UndoManager } from './undo';
import { injectFloatingLauncher } from './launcher';
import { Storage } from '../shared/storage';
import { ExtensionMessage } from '../shared/contracts/messages';

// Avoid mutation observer feedback loops
let isExtensionMutating = false;
let mutationDebounceTimer: any = null;

function checkForFormsAndMountLauncher(): void {
  const formControls = document.querySelectorAll('form, input, textarea, select');
  if (formControls.length > 0) {
    injectFloatingLauncher();
  }
}

// Setup MutationObserver with debounce
const observer = new MutationObserver(() => {
  if (isExtensionMutating) return;
  clearTimeout(mutationDebounceTimer);
  mutationDebounceTimer = setTimeout(() => {
    checkForFormsAndMountLauncher();
  }, 400);
});

observer.observe(document.body || document.documentElement, {
  childList: true,
  subtree: true,
});

checkForFormsAndMountLauncher();

// Message listener
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'PING': {
      sendResponse({ status: 'ok', active: true });
      break;
    }

    case 'SCAN_PAGE_REQUEST': {
      Storage.getProfile().then((profile) => {
        const scanResult = scanPageForFields(profile);
        sendResponse(scanResult);
      });
      return true; // Keep channel open for async response
    }

    case 'FILL_FIELDS_REQUEST': {
      isExtensionMutating = true;
      const payload = message.payload as { fields: Array<{ id: string; selector: string; value: string }> };
      fillFields(payload.fields).then((result) => {
        setTimeout(() => {
          isExtensionMutating = false;
        }, 100);
        sendResponse(result);
      });
      return true;
    }

    case 'FILL_SINGLE_FIELD_REQUEST': {
      isExtensionMutating = true;
      const payload = message.payload as { fieldId: string; selector: string; value: string };
      fillSingleElement(payload.selector, payload.value).then((res) => {
        setTimeout(() => {
          isExtensionMutating = false;
        }, 100);
        sendResponse(res);
      });
      return true;
    }

    case 'UNDO_TRANSACTION_REQUEST': {
      isExtensionMutating = true;
      const result = UndoManager.undoLastTransaction();
      setTimeout(() => {
        isExtensionMutating = false;
      }, 100);
      sendResponse(result);
      break;
    }

    case 'HIGHLIGHT_FIELD_REQUEST': {
      const payload = message.payload as { selector: string };
      const el = document.querySelector<HTMLElement>(payload.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const oldOutline = el.style.outline;
        el.style.outline = '2px solid #3b82f6';
        setTimeout(() => {
          el.style.outline = oldOutline;
        }, 1500);
      }
      sendResponse({ success: true });
      break;
    }
  }
});
