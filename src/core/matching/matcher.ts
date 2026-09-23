import { DetectedField, MatchConfidence, FillState } from '../../shared/schemas/fields';
import { UserProfile } from '../../shared/schemas/profile';
import { FIELD_RULES, FieldRule } from './rules';
import { normalizeText, matchOptionValue } from './normalizer';
import { evaluateFieldSensitivity } from '../security/sensitiveDetector';

export interface MatchResult {
  proposedProfileKey?: string;
  proposedValue?: string;
  matchReason?: string;
  confidence: MatchConfidence;
  fillState: FillState;
}

export function matchFieldToProfile(
  field: DetectedField,
  profile: UserProfile,
  adapterOverride?: { profileKey: string; value: string; reason: string }
): MatchResult {
  // 1. Check sensitive field detector first
  const sensitivity = evaluateFieldSensitivity({
    name: field.name,
    id: field.domId,
    label: field.label,
    placeholder: field.placeholder,
    ariaLabel: field.ariaLabel,
    type: field.inputType,
  });

  if (sensitivity.isBlocked) {
    return {
      confidence: 'blocked',
      fillState: 'blocked',
      matchReason: sensitivity.reason || 'Blocked: Sensitive field.',
    };
  }

  // 2. Platform adapter rule override if supplied
  if (adapterOverride) {
    return {
      proposedProfileKey: adapterOverride.profileKey,
      proposedValue: adapterOverride.value,
      matchReason: `Platform adapter: ${adapterOverride.reason}`,
      confidence: 'high',
      fillState: 'matched',
    };
  }

  // Text signals
  const normLabel = normalizeText(field.label);
  const normAria = normalizeText(field.ariaLabel);
  const normPlaceholder = normalizeText(field.placeholder);
  const normName = normalizeText(field.name);
  const normId = normalizeText(field.domId);

  let bestRule: FieldRule | null = null;
  let bestScore = 0;
  let bestReason = '';

  for (const rule of FIELD_RULES) {
    let score = 0;
    const reasons: string[] = [];

    // Exact autocomplete attribute match
    const autocompleteAttr = normalizeText(field.name || '');
    if (rule.exactAutocompletes.some((ac) => ac === autocompleteAttr)) {
      score += 40;
      reasons.push(`Autocomplete match (${autocompleteAttr})`);
    }

    // Exact normalized label match
    if (rule.exactLabels.some((el) => el === normLabel || el === normAria)) {
      score += 50;
      reasons.push('Exact normalized label match');
    } else if (normLabel && rule.regex.test(normLabel)) {
      // Regex label match
      score += 40;
      reasons.push('Pattern match on label');
    } else if (normAria && rule.regex.test(normAria)) {
      score += 35;
      reasons.push('Pattern match on ARIA label');
    }

    // Name or ID match
    if (normName && rule.regex.test(normName)) {
      score += 25;
      reasons.push('Pattern match on input name');
    }
    if (normId && rule.regex.test(normId)) {
      score += 20;
      reasons.push('Pattern match on DOM ID');
    }

    // Placeholder match
    if (normPlaceholder && rule.regex.test(normPlaceholder)) {
      score += 20;
      reasons.push('Pattern match on placeholder');
    }

    // Input type hint compatibility
    if (rule.inputTypeHint && rule.inputTypeHint.includes(field.inputType)) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
      bestReason = reasons.join(', ');
    }
  }

  if (!bestRule || bestScore < 30) {
    return {
      confidence: 'low',
      fillState: 'unfilled',
      matchReason: 'No strong deterministic pattern match found.',
    };
  }

  // Retrieve raw value from user profile
  const rawValue = bestRule.getter(profile);
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return {
      proposedProfileKey: bestRule.profileKey,
      confidence: 'low',
      fillState: 'review',
      matchReason: `Matched ${bestRule.profileKey}, but no value is saved in your profile.`,
    };
  }

  let finalValue = String(rawValue);

  // If select or radio or combobox, match against available options
  if ((field.inputType === 'select' || field.inputType === 'combobox' || field.inputType === 'radio') && field.options.length > 0) {
    const matchedOption = matchOptionValue(finalValue, field.options);
    if (matchedOption) {
      finalValue = matchedOption.value || matchedOption.label;
      bestScore += 10;
      bestReason += ` (Option mapped: "${matchedOption.label}")`;
    } else {
      return {
        proposedProfileKey: bestRule.profileKey,
        proposedValue: finalValue,
        confidence: 'medium',
        fillState: 'review',
        matchReason: `Could not unambiguously map profile value "${finalValue}" to dropdown options.`,
      };
    }
  }

  // Determine final confidence
  let confidence: MatchConfidence = 'low';
  let fillState: FillState = 'unfilled';

  if (bestScore >= 50) {
    confidence = 'high';
    fillState = 'matched';
  } else {
    confidence = 'medium';
    fillState = 'review';
  }

  return {
    proposedProfileKey: bestRule.profileKey,
    proposedValue: finalValue,
    matchReason: bestReason,
    confidence,
    fillState,
  };
}
