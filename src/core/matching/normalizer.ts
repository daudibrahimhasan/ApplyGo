export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[*:\-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeQuestion(question: string): string {
  return normalizeText(question)
    .replace(/^(please\s+)?(describe|explain|tell\s+us\s+about|provide|detail)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
}

export const COUNTRY_ALIASES: Record<string, string[]> = {
  'United States': ['united states', 'usa', 'u.s.a.', 'us', 'u.s.', 'america', 'united states of america'],
  'United Kingdom': ['united kingdom', 'uk', 'u.k.', 'great britain', 'britain', 'england'],
  'Canada': ['canada', 'ca'],
};

export const DEGREE_ALIASES: Record<string, string[]> = {
  'Bachelor of Science': ['bachelor of science', 'b.s.', 'bs', 'bachelor\'s', 'bachelors', 'undergraduate'],
  'Master of Science': ['master of science', 'm.s.', 'ms', 'master\'s', 'masters', 'graduate'],
  'Doctor of Philosophy': ['phd', 'ph.d.', 'doctorate', 'doctoral'],
};

export function matchOptionValue(
  targetValue: string,
  options: Array<{ label: string; value: string }>
): { label: string; value: string } | null {
  const normTarget = normalizeText(targetValue);
  if (!normTarget) return null;

  // 1. Exact value match
  for (const opt of options) {
    if (normalizeText(opt.value) === normTarget || normalizeText(opt.label) === normTarget) {
      return opt;
    }
  }

  // 2. Check known aliases (e.g. Country, Degree)
  for (const [canonical, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.includes(normTarget)) {
      for (const opt of options) {
        const normOpt = normalizeText(opt.label || opt.value);
        if (aliases.includes(normOpt) || normOpt === normalizeText(canonical)) {
          return opt;
        }
      }
    }
  }

  for (const [canonical, aliases] of Object.entries(DEGREE_ALIASES)) {
    if (aliases.includes(normTarget)) {
      for (const opt of options) {
        const normOpt = normalizeText(opt.label || opt.value);
        if (aliases.includes(normOpt) || normOpt === normalizeText(canonical)) {
          return opt;
        }
      }
    }
  }

  // 3. Normalized substring inclusion if unambiguous
  const matches = options.filter((opt) => {
    const normOpt = normalizeText(opt.label || opt.value);
    return normOpt.includes(normTarget) || normTarget.includes(normOpt);
  });

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}
