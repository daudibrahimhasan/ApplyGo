/** Read a user's answer, rather than the raw option value of an unanswered control. */
export function readFieldValue(element: HTMLElement): string {
  if (element instanceof HTMLInputElement) {
    if (element.type === 'radio') {
      const group = element.name
        ? Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
            .filter((item) => item.name === element.name)
        : [element];
      return group.find((item) => item.checked)?.value || '';
    }
    if (element.type === 'checkbox') return element.checked ? element.value : '';
  }
  if (element instanceof HTMLSelectElement) {
    const option = element.selectedOptions[0];
    if (!option || !option.value || option.disabled ||
      /^(select|choose|please select|please choose)(\b|[.])/i.test(option.text.trim())) return '';
    return element.value;
  }
  if ('value' in element) return String((element as HTMLInputElement).value || '');
  if (element.getAttribute('contenteditable') === 'true') return element.textContent?.trim() || '';
  if (element.getAttribute('role') === 'combobox') {
    return element.querySelector<HTMLInputElement>('input')?.value ||
      element.querySelector('[aria-selected="true"]')?.textContent?.trim() || '';
  }
  return '';
}
