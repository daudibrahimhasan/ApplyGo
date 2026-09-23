import { FillTransaction } from '../shared/schemas/fields';

function restoreNativeValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

export class UndoManager {
  private static transactions: FillTransaction[] = [];

  public static recordTransaction(tx: FillTransaction): void {
    this.transactions.push(tx);
  }

  public static canUndo(): boolean {
    return this.transactions.length > 0;
  }

  public static undoLastTransaction(): { success: boolean; restoredCount: number; message?: string } {
    const tx = this.transactions.pop();
    if (!tx) {
      return { success: false, restoredCount: 0, message: 'No fill operations to undo.' };
    }

    let restoredCount = 0;
    // Iterate in reverse order
    for (let i = tx.entries.length - 1; i >= 0; i--) {
      const entry = tx.entries[i];
      if (!entry.success) continue;

      const el = document.querySelector<HTMLElement>(entry.selector);
      if (el && el.isConnected) {
        if (el.tagName.toLowerCase() === 'select' || el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea') {
          restoreNativeValue(el as HTMLInputElement, entry.previousValue);
          restoredCount++;
        } else {
          el.textContent = entry.previousValue;
          el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
          el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
          restoredCount++;
        }
      }
    }

    return {
      success: true,
      restoredCount,
      message: `Restored ${restoredCount} field${restoredCount === 1 ? '' : 's'} to previous values.`,
    };
  }
}
