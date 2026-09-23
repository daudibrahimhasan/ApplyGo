import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeQuestion, matchOptionValue } from '../../src/core/matching/normalizer';

describe('normalizer', () => {
  it('normalizes whitespace and removes punctuation', () => {
    expect(normalizeText('  First - Name: * ')).toBe('first name');
    expect(normalizeText('E-Mail_Address')).toBe('e mail address');
  });

  it('normalizes common question preambles', () => {
    expect(normalizeQuestion('Please describe your research interests?')).toBe('your research interests');
    expect(normalizeQuestion('Explain your background in AI safety.')).toBe('your background in ai safety');
  });

  it('matches exact options', () => {
    const options = [
      { label: 'United States', value: 'US' },
      { label: 'United Kingdom', value: 'UK' },
    ];
    const match = matchOptionValue('United States', options);
    expect(match).toEqual({ label: 'United States', value: 'US' });
  });

  it('matches option aliases (e.g. USA -> US)', () => {
    const options = [
      { label: 'United States', value: 'US' },
      { label: 'Canada', value: 'CA' },
    ];
    const match = matchOptionValue('USA', options);
    expect(match?.value).toBe('US');
  });

  it('matches degree aliases (e.g. Bachelor of Science -> BS)', () => {
    const options = [
      { label: 'Bachelor of Science', value: 'BS' },
      { label: 'Master of Science', value: 'MS' },
    ];
    const match = matchOptionValue('Bachelor of Science', options);
    expect(match?.value).toBe('BS');
  });

  it('returns null on ambiguous matches', () => {
    const options = [
      { label: 'California North', value: 'CA_N' },
      { label: 'California South', value: 'CA_S' },
    ];
    const match = matchOptionValue('California', options);
    expect(match).toBeNull();
  });
});
