import { scanPageForFields } from './scanner';
import { fillFields, fillFileElement, fillSingleElement } from './filler';
import { UndoManager } from './undo';
import { injectFloatingLauncher } from './launcher';
import { ExtensionMessage } from '../shared/contracts/messages';
import { UserProfile } from '../shared/schemas/profile';

// Avoid mutation observer feedback loops
let isExtensionMutating = false;
let mutationDebounceTimer: any = null;
let formSignature: string | null = null;

function checkForFormsAndMountLauncher(): void {
  const formControls = document.querySelectorAll('form, input, textarea, select');
  if (formControls.length > 0) {
    injectFloatingLauncher();
  }
  const signature = Array.from(document.querySelectorAll('input, textarea, select, [role="combobox"], [role="textbox"], [contenteditable="true"]'))
    .map((element) => `${element.id}|${element.getAttribute('name')}|${element.getAttribute('type')}|${element.getAttribute('aria-label')}|${element.getAttribute('aria-labelledby')}`)
    .join(';') + Array.from(document.querySelectorAll('label, [role="heading"], [data-question-id]')).map((label) => label.textContent).join(';');
  if (signature !== formSignature) {
    const hadPreviousScan = formSignature !== null;
    formSignature = signature;
    if (hadPreviousScan) {
      chrome.runtime.sendMessage({ type: 'FORM_CHANGED' }, () => { void chrome.runtime.lastError; });
    }
  }
}

// Setup MutationObserver with debounce
const observer = new MutationObserver(() => {
  clearTimeout(mutationDebounceTimer);
  mutationDebounceTimer = setTimeout(function checkAfterFill() {
    if (isExtensionMutating) {
      mutationDebounceTimer = setTimeout(checkAfterFill, 100);
      return;
    }
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
      chrome.runtime.sendMessage(
        { type: 'GET_PROFILE_FOR_SCAN_REQUEST' },
        (profile: UserProfile | undefined) => {
          if (chrome.runtime.lastError || !profile) {
            sendResponse({
              opportunity: null,
              fields: [],
              url: window.location.href,
              error: chrome.runtime.lastError?.message || 'Profile could not be loaded.',
            });
            return;
          }
          sendResponse(scanPageForFields(profile));
        }
      );
      return true; // Keep channel open for async response
    }

    case 'FILL_FIELDS_REQUEST': {
      const payload = message.payload as {
        fields: Array<{ id: string; selector: string; value: string }>;
        fillDelayMs?: number;
        expectedUrl?: string;
        resume?: { selector: string; name: string; fileType: 'pdf' | 'docx'; dataUrl: string };
      };
      if (payload.expectedUrl && payload.expectedUrl !== window.location.href) {
        sendResponse({ error: 'The page changed. Rescan before filling.' });
        return;
      }
      isExtensionMutating = true;
      fillFields(payload.fields, payload.fillDelayMs).then(async (result) => {
        if (payload.resume) {
          const resumeResult = await fillFileElement(payload.resume.selector, payload.resume);
          if (resumeResult.success) result.successCount += 1;
          else result.failureCount += 1;
        }
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
