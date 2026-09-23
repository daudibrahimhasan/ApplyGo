import { DetectedField, PageOpportunity, InputType, FieldOption } from '../shared/schemas/fields';
import { UserProfile } from '../shared/schemas/profile';
import { extractFieldSignals } from './signals';
import { evaluateFieldSensitivity } from '../core/security/sensitiveDetector';
import { matchFieldToProfile } from '../core/matching/matcher';
import { findMatchingAdapter } from './adapters';

export function getUniqueSelector(el: HTMLElement): string {
  if (el.id && !/^\d/.test(el.id)) {
    return `#${CSS.escape(el.id)}`;
  }
  if (el.getAttribute('name')) {
    const name = el.getAttribute('name')!;
    const tagName = el.tagName.toLowerCase();
    const matches = document.querySelectorAll(`${tagName}[name="${CSS.escape(name)}"]`);
    if (matches.length === 1) {
      return `${tagName}[name="${CSS.escape(name)}"]`;
    }
  }

  // Path hierarchy
  const path: string[] = [];
  let curr: HTMLElement | null = el;
  while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.body) {
    let tag = curr.tagName.toLowerCase();
    const parentNode: HTMLElement | null = curr.parentElement;
    if (parentNode) {
      const siblings = Array.from(parentNode.children).filter((c: Element) => c.tagName.toLowerCase() === tag);
      if (siblings.length > 1) {
        const index = siblings.indexOf(curr) + 1;
        tag += `:nth-of-type(${index})`;
      }
    }
    path.unshift(tag);
    curr = parentNode;
  }
  return path.join(' > ');
}

function isElementVisible(el: HTMLElement): boolean {
  const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
  if (!isJsdom && el.offsetWidth === 0 && el.offsetHeight === 0) {
    // Check if parent has bounding rect (e.g. custom inputs)
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
  }
  if (el.hasAttribute('hidden')) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  // Honeypot detection (element or container positioned off-screen)
  if (
    style.position === 'absolute' &&
    (parseInt(style.left, 10) < -1000 || parseInt(style.top, 10) < -1000)
  ) {
    return false;
  }
  if (el.closest('.honeypot, [style*="-9999px"], [style*="display: none"]')) {
    return false;
  }

  return true;
}

function classifyInputType(el: HTMLElement): InputType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return 'textarea';
  if (tag === 'select') return 'select';

  const role = el.getAttribute('role');
  if (role === 'combobox') return 'combobox';

  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['email', 'tel', 'url', 'number', 'date', 'radio', 'checkbox', 'file'].includes(type)) {
      return type as InputType;
    }
    return 'text';
  }

  return 'text';
}

function extractOptions(el: HTMLElement): FieldOption[] {
  const tag = el.tagName.toLowerCase();
  const options: FieldOption[] = [];

  if (tag === 'select') {
    const select = el as HTMLSelectElement;
    Array.from(select.options).forEach((opt) => {
      // Ignore placeholder options like "Select...", "Choose one"
      if (opt.value === '' && /select|choose|none/i.test(opt.text)) return;
      options.push({
        label: opt.text.trim(),
        value: opt.value,
        id: opt.id || undefined,
      });
    });
  } else if (el.getAttribute('role') === 'combobox') {
    // Look for aria-controls or sibling listbox
    const controlsId = el.getAttribute('aria-controls') || el.getAttribute('aria-owns');
    if (controlsId) {
      const listbox = document.getElementById(controlsId);
      if (listbox) {
        listbox.querySelectorAll('[role="option"]').forEach((opt) => {
          options.push({
            label: opt.textContent?.trim() || '',
            value: opt.getAttribute('data-value') || opt.textContent?.trim() || '',
            id: opt.id || undefined,
          });
        });
      }
    }
  }

  return options;
}

export function scanPageForFields(profile: UserProfile): {
  opportunity: PageOpportunity;
  fields: DetectedField[];
  url: string;
} {
  const url = window.location.href;
  const adapter = findMatchingAdapter(url, document);
  const oppMeta = adapter.extractOpportunity(document);

  const opportunity: PageOpportunity = {
    organization: oppMeta.organization || '',
    opportunityName: oppMeta.opportunityName || document.title,
    opportunityType: oppMeta.opportunityType || 'General Opportunity',
    url,
    detectedPlatform: adapter.name,
  };

  // Find candidate form controls
  const query = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
    'textarea',
    'select',
    '[role="combobox"]',
  ].join(', ');

  const elements = Array.from(document.querySelectorAll<HTMLElement>(query));
  const detected: DetectedField[] = [];

  elements.forEach((el, index) => {
    if (!isElementVisible(el)) return;
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;

    // Check honeypot attributes
    if (el.getAttribute('tabindex') === '-1' && !el.getAttribute('aria-label')) {
      return;
    }

    const inputType = classifyInputType(el);
    const selector = getUniqueSelector(el);
    const domId = el.id || '';
    const name = el.getAttribute('name') || '';
    const currentValue = 'value' in el ? String((el as HTMLInputElement).value || '') : '';
    const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';

    const signals = extractFieldSignals(el);
    const options = extractOptions(el);

    const sensitivityCheck = evaluateFieldSensitivity({
      name,
      id: domId,
      label: signals.label,
      placeholder: signals.placeholder,
      ariaLabel: signals.ariaLabel,
      type: inputType,
      autocomplete: el.getAttribute('autocomplete') || undefined,
    });

    const field: DetectedField = {
      id: `field_${index}_${domId || name || index}`,
      selector,
      inputType,
      label: signals.label,
      placeholder: signals.placeholder,
      name,
      domId,
      ariaLabel: signals.ariaLabel,
      ariaDescription: signals.ariaDescription,
      nearbyInstructions: signals.nearbyInstructions,
      sectionHeading: signals.sectionHeading,
      options,
      required,
      currentValue,
      characterLimit: signals.characterLimit,
      wordLimit: signals.wordLimit,
      visibility: true,
      disabled: false,
      sensitivity: sensitivityCheck.isBlocked ? 'blocked' : 'safe',
      confidence: 'low',
      fillState: 'unfilled',
    };

    // Deterministic match against profile
    const match = matchFieldToProfile(field, profile);
    field.proposedProfileKey = match.proposedProfileKey;
    field.proposedValue = match.proposedValue;
    field.matchReason = match.matchReason;
    field.confidence = match.confidence;
    field.fillState = match.fillState;

    detected.push(field);
  });

  return {
    opportunity,
    fields: detected,
    url,
  };
}
