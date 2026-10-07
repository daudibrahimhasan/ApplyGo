import { FillTransaction } from '../shared/schemas/fields';
import { evaluateFieldSensitivity } from '../core/security/sensitiveDetector';
import { normalizeText, matchOptionValue } from '../core/matching/normalizer';
import { UndoManager } from './undo';
import { readFieldValue } from './fieldValue';

export interface FillFieldItem {
  id: string;
  selector: string;
  value: string;
}

export interface FillResult {
  transaction: FillTransaction;
  successCount: number;
  failureCount: number;
}

export async function fillFileElement(
  selector: string,
  resume: { name: string; fileType: 'pdf' | 'docx'; dataUrl: string }
): Promise<{ success: boolean; reason?: string }> {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input || input.type !== 'file') return { success: false, reason: 'File input not found.' };
  if (!resume.dataUrl) return { success: false, reason: 'Stored resume file data is missing.' };

  try {
    const blob = await fetch(resume.dataUrl).then((response) => response.blob());
    const mimeType = resume.fileType === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const file = new File([blob], resume.name, { type: mimeType, lastModified: Date.now() });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    const success = input.files?.[0]?.name === resume.name;
    flashHighlight(input, success);
    return { success, reason: success ? undefined : 'The page rejected the stored resume.' };
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : 'Resume attachment failed.' };
  }
}

/**
 * Safely sets the value of an input or textarea element, ensuring React/Vue
 * synthetic event listeners and controlled component state detect the change.
 */
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch events with full bubbling and composed flags
  element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function flashHighlight(element: HTMLElement, success: boolean): void {
  const originalOutline = element.style.outline;
  const originalTransition = element.style.transition;

  element.style.transition = 'outline 0.15s ease-in-out';
  element.style.outline = success ? '2px solid #10b981' : '2px solid #ef4444';

  setTimeout(() => {
    element.style.outline = originalOutline;
    element.style.transition = originalTransition;
  }, 1200);
}

export async function fillSingleElement(
  selector: string,
  targetValue: string
): Promise<{ success: boolean; previousValue: string; actualValue: string; reason?: string }> {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) {
    return { success: false, previousValue: '', actualValue: '', reason: 'Element not found in DOM' };
  }

  // 1. Confirm connected
  if (!el.isConnected) {
    return { success: false, previousValue: '', actualValue: '', reason: 'Element is not connected to DOM' };
  }

  // 2. Confirm enabled & visible
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    return { success: false, previousValue: '', actualValue: '', reason: 'Element is disabled' };
  }
  if (el.hasAttribute('readonly') || el.getAttribute('aria-readonly') === 'true') {
    return { success: false, previousValue: '', actualValue: '', reason: 'Field is read-only' };
  }

  // 3. Confirm not sensitive
  const sensitivity = evaluateFieldSensitivity({
    name: el.getAttribute('name') || undefined,
    id: el.id || undefined,
    type: el.getAttribute('type') || undefined,
  });
  if (sensitivity.isBlocked) {
    return { success: false, previousValue: '', actualValue: '', reason: 'Field is sensitive/blocked' };
  }

  const previousValue = readFieldValue(el);

  // 4. Do not overwrite if user already entered non-empty different value
  if (previousValue && previousValue !== targetValue) {
    // Preserve existing user value
    return {
      success: false,
      previousValue,
      actualValue: previousValue,
      reason: 'Field already contains user-entered value; preserving existing content.',
    };
  }

  // 5. Fill based on element type
  const tag = el.tagName.toLowerCase();

  if (tag === 'select') {
    const select = el as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => ({ label: o.text, value: o.value }));
    const match = matchOptionValue(targetValue, options);
    if (!match) {
      flashHighlight(el, false);
      return {
        success: false,
        previousValue,
        actualValue: select.value,
        reason: `Could not match "${targetValue}" to select options.`,
      };
    }
    setNativeValue(select, match.value);
  } else if (tag === 'input' && (el as HTMLInputElement).type === 'radio') {
    const input = el as HTMLInputElement;
    const group = input.name
      ? Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
          .filter((candidate) => candidate.name === input.name)
      : [input];
    const candidates = group.map((candidate) => {
      const explicitLabel = candidate.id
        ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(candidate.id)}"]`)
        : null;
      const wrappingLabel = candidate.closest('label');
      const label = explicitLabel?.textContent || wrappingLabel?.textContent || candidate.value;
      return { candidate, label: label.trim(), value: candidate.value };
    });
    const matched = matchOptionValue(
      targetValue,
      candidates.map((item) => ({ label: item.label, value: item.value }))
    );
    const target = matched
      ? candidates.find((item) => item.value === matched.value || item.label === matched.label)?.candidate
      : undefined;
    if (!target) {
      flashHighlight(el, false);
      return { success: false, previousValue, actualValue: '', reason: `Could not match "${targetValue}" to radio options.` };
    }
    target.click();
    target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    flashHighlight(target, target.checked);
    return {
      success: target.checked,
      previousValue,
      actualValue: target.checked ? target.value : '',
      reason: target.checked ? undefined : 'The page rejected the radio selection.',
    };
  } else if (tag === 'input' || tag === 'textarea') {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    setNativeValue(input, targetValue);
  } else if (el.getAttribute('contenteditable') === 'true') {
    el.focus();
    el.textContent = targetValue;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: targetValue }));
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  } else if (el.getAttribute('role') === 'combobox') {
    // Custom comboboxes (including Airtable) need a real open-and-select interaction.
    const innerInput = el.querySelector<HTMLInputElement>('input');
    if (innerInput) {
      setNativeValue(innerInput, targetValue);
    }
    el.click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
      .filter((option) => option.offsetParent !== null);
    const matched = matchOptionValue(
      targetValue,
      options.map((option) => ({
        label: (option.textContent || '').trim(),
        value: option.getAttribute('data-value') || option.getAttribute('value') || (option.textContent || '').trim(),
      }))
    );
    const option = matched
      ? options.find((candidate) => {
          const text = (candidate.textContent || '').trim();
          const value = candidate.getAttribute('data-value') || candidate.getAttribute('value') || text;
          return text === matched.label || value === matched.value;
        })
      : undefined;
    if (!option) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      flashHighlight(el, false);
      return { success: false, previousValue, actualValue: '', reason: `Could not match "${targetValue}" to combobox options.` };
    }
    option.click();
    option.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  // Read back value to verify framework retained it
  const readBack = 'value' in el ? String((el as HTMLInputElement).value || '') : el.textContent || '';
  const normalizedReadBack = normalizeText(readBack);
  const normalizedTarget = normalizeText(targetValue);
  const success = normalizedReadBack === normalizedTarget ||
    (el.getAttribute('role') === 'combobox' && normalizedReadBack.includes(normalizedTarget));

  flashHighlight(el, success);

  return {
    success,
    previousValue,
    actualValue: readBack,
    reason: success ? undefined : 'Framework reverted or rejected set value.',
  };
}

export async function fillFields(items: FillFieldItem[], delayMs = 40): Promise<FillResult> {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entries: FillTransaction['entries'] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const [index, item] of items.entries()) {
    if (index > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 500)));
    }
    const result = await fillSingleElement(item.selector, item.value);
    entries.push({
      fieldId: item.id,
      selector: item.selector,
      previousValue: result.previousValue,
      filledValue: result.actualValue,
      success: result.success,
    });

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  const transaction: FillTransaction = {
    id: transactionId,
    timestamp: new Date().toISOString(),
    entries,
  };

  UndoManager.recordTransaction(transaction);

  return {
    transaction,
    successCount,
    failureCount,
  };
}
