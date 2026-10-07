import { DetectedField } from '../../shared/schemas/fields';

const BASIC_KEYS = new Set([
  'personal.firstName', 'personal.lastName', 'personal.fullName', 'personal.email',
  'personal.phone', 'personal.city', 'personal.region', 'personal.country', 'personal.location',
  'personal.pronouns', 'links.linkedin', 'links.github', 'links.portfolio', 'links.website',
]);

export function isBasicAutofill(field: DetectedField): boolean {
  return field.visibility && !field.disabled && !field.currentValue &&
    field.sensitivity === 'safe' && field.confidence === 'high' &&
    Boolean(field.proposedValue && BASIC_KEYS.has(field.proposedProfileKey || ''));
}

export function isWrittenQuestion(field: DetectedField): boolean {
  return field.visibility && !field.disabled && field.sensitivity === 'safe' &&
    !field.proposedProfileKey && ['text', 'textarea'].includes(field.inputType) &&
    Boolean(field.label || field.ariaLabel || field.placeholder) &&
    !/^(email|phone|address|url|link|first name|last name|full name|name)\b/i.test(field.label.trim()) &&
    !/\b(visa|travel authorization|work authorization|pronouns|date of birth|postal code|zip code|email address|phone number)\b/i.test(field.label) &&
    !/^(where (are you|do you) (traveling from|live|based)|can you attend|how did you hear|what is your (address|name|email|location))\b/i.test(field.label.trim());
}
