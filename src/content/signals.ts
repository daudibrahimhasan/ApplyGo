const CONTROL_SELECTOR = 'input:not([type="hidden"]), textarea, select, [role="combobox"], [role="textbox"]';

function cleanLabel(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/(?:\s*(?:\*|:|\(required\)|required))+\s*$/gi, '').trim();
}

function usefulLabel(node: Element | null): string {
  if (!node || node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return '';
  const clone = node.cloneNode(true) as Element;
  clone.querySelectorAll('input, textarea, select, button, [role="option"], [role="listbox"], [aria-hidden="true"]').forEach((item) => item.remove());
  const text = cleanLabel(clone.textContent || '');
  return text.length <= 250 && !/^(your answer|select|choose|answer here|optional)$/i.test(text) ? text : '';
}

/** ARIA ID references are whitespace-separated, not a single DOM ID. */
function referencedText(element: HTMLElement, attribute: string): string {
  const root = element.getRootNode() as Document | ShadowRoot;
  return (element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)
    .map((id) => root.getElementById?.(id)?.textContent?.trim() || '')
    .filter(Boolean).join(' ');
}

/** Stay within the nearest question; do not use a neighboring question's title. */
function questionContainer(element: HTMLElement): HTMLElement | null {
  const semantic = element.closest<HTMLElement>('[role="listitem"], [data-question-id], [data-question], .form-group, .form-field, .field, [class*="question"], [data-testid*="field"]');
  if (semantic && semantic.querySelectorAll('[role="listitem"], [data-question-id]').length === 0 &&
      (semantic.matches('[role="listitem"], [data-question-id], [data-question]') || semantic.querySelectorAll(CONTROL_SELECTOR).length <= 1)) return semantic;
  let parent = element.parentElement;
  for (let depth = 0; parent && depth < 6; depth++, parent = parent.parentElement) {
    if (parent.matches('form, body, html')) break;
    const controls = Array.from(parent.querySelectorAll(CONTROL_SELECTOR));
    const independent = controls.filter((control) => !controls.some((other) => other !== control && other.contains(control)));
    if (independent.length > 1) break;
    if (parent.querySelector('label, [role="heading"], legend, h1, h2, h3, h4, [class*="label"], [class*="title"]')) return parent;
  }
  return null;
}

function nearbyLabel(element: HTMLElement, container: HTMLElement | null): string {
  if (container) {
    const headings = Array.from(container.querySelectorAll('label, [role="heading"], legend, h1, h2, h3, h4, [class*="label"], [class*="title"], [data-testid*="label"]'));
    for (const heading of headings) {
      if (heading.contains(element) || element.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING) {
        const text = usefulLabel(heading);
        if (text) return text;
      }
    }
  }
  let current: HTMLElement | null = element;
  for (let depth = 0; current && depth < 4; depth++, current = current.parentElement) {
    if (current.matches('form, body, html')) break;
    const sibling = current.previousElementSibling;
    if (sibling && !sibling.matches(CONTROL_SELECTOR) && !sibling.querySelector('input, textarea, select, [role="combobox"], [role="textbox"]')) {
      const text = usefulLabel(sibling);
      if (text) return text;
    }
    const parent: HTMLElement | null = current.parentElement;
    if (!parent || parent.querySelectorAll(CONTROL_SELECTOR).length > 1) break;
    const textBefore = Array.from(parent.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE && Boolean(node.compareDocumentPosition(current!) & Node.DOCUMENT_POSITION_FOLLOWING))
      .map((node) => node.textContent || '').join(' ');
    if (cleanLabel(textBefore)) return cleanLabel(textBefore);
  }
  return '';
}

export function extractFieldSignals(element: HTMLElement): {
  label: string;
  placeholder: string;
  ariaLabel: string;
  ariaDescription: string;
  nearbyInstructions: string;
  sectionHeading: string;
  characterLimit?: number;
  wordLimit?: number;
} {
  let label = '';
  let placeholder = '';
  let ariaLabel = element.getAttribute('aria-label') || '';
  let ariaDescription = '';
  let nearbyInstructions = '';
  let sectionHeading = '';
  let characterLimit: number | undefined;
  let wordLimit: number | undefined;

  // 1. Placeholder
  if ('placeholder' in element) {
    placeholder = (element as HTMLInputElement).placeholder || '';
  }

  const container = questionContainer(element);
  ariaLabel = cleanLabel(referencedText(element, 'aria-labelledby') || ariaLabel);
  ariaDescription = referencedText(element, 'aria-describedby');

  // Native associations and ARIA always take priority over inferred nearby text.
  const nativeLabels = 'labels' in element
    ? Array.from((element as HTMLInputElement).labels || []).map(usefulLabel).filter(Boolean).join(' ')
    : '';
  label = cleanLabel(nativeLabels || ariaLabel || usefulLabel(element.closest('label')));
  if (!label) label = nearbyLabel(element, container);

  // 7. Fieldset legend or Section heading
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) {
      sectionHeading = legend.textContent?.trim() || '';
    }
  }
  if (!sectionHeading) {
    const section = element.closest('section, form, div[class*="section"]');
    if (section) {
      const heading = section.querySelector('h1, h2, h3, h4, [class*="heading"]');
      if (heading) {
        sectionHeading = heading.textContent?.trim() || '';
      }
    }
  }

  // 8. Length limits (maxlength attribute)
  const maxlength = element.getAttribute('maxlength');
  if (maxlength) {
    const parsed = parseInt(maxlength, 10);
    if (!isNaN(parsed) && parsed > 0) {
      characterLimit = parsed;
    }
  }

  // 9. Check nearby hint text for word or character limits
  const parentContainer = container || element.parentElement;
  if (parentContainer) {
    const hintText = parentContainer.textContent || '';
    // Look for e.g. "Max 250 words" or "Limit: 500 characters"
    const wordMatch = hintText.match(/(\d+)\s*(?:words|word\s*limit|max\s*words)/i);
    if (wordMatch) {
      wordLimit = parseInt(wordMatch[1], 10);
    }
    const charMatch = hintText.match(/(\d+)\s*(?:chars|characters|max\s*characters)/i);
    if (charMatch && !characterLimit) {
      characterLimit = parseInt(charMatch[1], 10);
    }
    nearbyInstructions = ariaDescription || hintText.replace(label, '').replace(placeholder, '').trim().slice(0, 150);
  }

  return {
    label,
    placeholder,
    ariaLabel,
    ariaDescription,
    nearbyInstructions,
    sectionHeading,
    characterLimit,
    wordLimit,
  };
}
