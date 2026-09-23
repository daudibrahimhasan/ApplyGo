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

  // 2. ARIA labelledby
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const labelEl = document.getElementById(ariaLabelledby);
    if (labelEl) {
      ariaLabel = labelEl.textContent?.trim() || ariaLabel;
    }
  }

  // 3. ARIA describedby
  const ariaDescribedby = element.getAttribute('aria-describedby');
  if (ariaDescribedby) {
    const descEl = document.getElementById(ariaDescribedby);
    if (descEl) {
      ariaDescription = descEl.textContent?.trim() || '';
    }
  }

  // 4. Associated <label for="id">
  if (element.id) {
    const explicitLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
    if (explicitLabel) {
      label = explicitLabel.textContent?.trim() || '';
    }
  }

  // 5. Parent <label>
  if (!label) {
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Clone label and remove element text to avoid duplication
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, select, textarea, button').forEach((n) => n.remove());
      label = clone.textContent?.trim() || '';
    }
  }

  // 6. Preceding sibling or parent container label (common in custom divs)
  if (!label) {
    const fieldContainer = element.closest('.form-group, .field, .form-field, [class*="question"], [class*="field"], [data-testid*="field"]');
    if (fieldContainer) {
      const heading = fieldContainer.querySelector('label, [class*="label"], [class*="title"], [class*="header"]');
      if (heading && heading !== element) {
        label = heading.textContent?.trim() || '';
      }
    }
  }

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
  const parentContainer = element.parentElement;
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
