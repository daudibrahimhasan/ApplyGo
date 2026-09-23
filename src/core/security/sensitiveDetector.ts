export interface SensitiveCheckResult {
  isSensitive: boolean;
  isBlocked: boolean;
  category: string | null;
  reason: string | null;
}

const BLOCKED_PATTERNS = [
  // Authentication & Passwords
  { category: 'password', regex: /password|pwd|passcode|secret/i },
  { category: 'security_question', regex: /mother'?s maiden|first pet|security question/i },
  { category: 'pin_otp', regex: /\b(pin|otp|token|2fa|mfa|verification code)\b/i },

  // Financial & Banking
  { category: 'banking', regex: /bank account|routing number|iban|swift|sort code/i },
  { category: 'payment_card', regex: /credit card|debit card|card number|cvv|cvc|expir(y|ation)/i },

  // Government & National IDs
  { category: 'government_id', regex: /\b(ssn|social security|national id|passport|tax id|ein|sin)\b/i },

  // Medical & Health
  { category: 'medical', regex: /medical history|disability|diagnosis|health condition|prescription/i },

  // Criminal History
  { category: 'criminal_history', regex: /felony|misdemeanor|criminal record|convicted/i },

  // Legal declarations & consent
  { category: 'legal_signature', regex: /signature|sign here|digitally sign|typed signature/i },
  { category: 'certification', regex: /certify that|declare under penalty|agree to the terms|consent to/i },
];

const DEMOGRAPHIC_PATTERNS = [
  { category: 'demographic_gender', regex: /\b(gender|sexuality|sexual orientation)\b/i },
  { category: 'demographic_race', regex: /\b(race|ethnicity|hispanic|latino)\b/i },
  { category: 'demographic_veteran', regex: /\b(veteran status|military service)\b/i },
];

export function evaluateFieldSensitivity(signals: {
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  ariaLabel?: string;
  type?: string;
  autocomplete?: string;
}): SensitiveCheckResult {
  const combined = [
    signals.name,
    signals.id,
    signals.label,
    signals.placeholder,
    signals.ariaLabel,
    signals.autocomplete,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Password type attribute is strictly blocked
  if (signals.type === 'password') {
    return {
      isSensitive: true,
      isBlocked: true,
      category: 'password',
      reason: 'Field is an input of type password.',
    };
  }

  // Check hard blocked categories
  for (const item of BLOCKED_PATTERNS) {
    if (item.regex.test(combined)) {
      return {
        isSensitive: true,
        isBlocked: true,
        category: item.category,
        reason: `Matched protected/sensitive category: ${item.category}`,
      };
    }
  }

  // Check demographic fields - sensitive, blocked from automatic autofill
  for (const item of DEMOGRAPHIC_PATTERNS) {
    if (item.regex.test(combined)) {
      return {
        isSensitive: true,
        isBlocked: true,
        category: item.category,
        reason: 'Demographic questions require explicit manual review and are excluded from safe autofill.',
      };
    }
  }

  return {
    isSensitive: false,
    isBlocked: false,
    category: null,
    reason: null,
  };
}
