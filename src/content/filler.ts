import { FillTransaction } from '../shared/schemas/fields';
import { evaluateFieldSensitivity } from '../core/security/sensitiveDetector';
import { normalizeText, matchOptionValue } from '../core/matching/normalizer';
import { UndoManager } from './undo';

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

  // 3. Confirm not sensitive
  const sensitivity = evaluateFieldSensitivity({
    name: el.getAttribute('name') || undefined,
    id: el.id || undefined,
    type: el.getAttribute('type') || undefined,
  });
  if (sensitivity.isBlocked) {
    return { success: false, previousValue: '', actualValue: '', reason: 'Field is sensitive/blocked' };
  }

  const previousValue = 'value' in el ? String((el as HTMLInputElement).value || '') : '';

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
  } else if (tag === 'input' || tag === 'textarea') {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    setNativeValue(input, targetValue);
  } else if (el.getAttribute('role') === 'combobox') {
    // Custom combobox: set textContent or aria-valuenow or internal input
    const innerInput = el.querySelector<HTMLInputElement>('input');
    if (innerInput) {
      setNativeValue(innerInput, targetValue);
    } else {
      el.textContent = targetValue;
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  // Read back value to verify framework retained it
  const readBack = 'value' in el ? String((el as HTMLInputElement).value || '') : el.textContent || '';
  const success = normalizeText(readBack) === normalizeText(targetValue);

  flashHighlight(el, success);

  return {
    success,
    previousValue,
    actualValue: readBack,
    reason: success ? undefined : 'Framework reverted or rejected set value.',
  };
}

export async function fillFields(items: FillFieldItem[]): Promise<FillResult> {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entries: FillTransaction['entries'] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const item of items) {
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
