import { describe, it, expect } from 'vitest';
import { validateGeneratedOutput } from '../../src/core/generation/validator';

describe('validator', () => {
  it('validates compliant model output', () => {
    const raw = {
      answer: 'I conducted counterfactual probing experiments on LLMs to test unlearning.',
      usedKnowledgeIds: ['know_unlearning'],
      unsupportedClaims: [],
      missingInformation: [],
      confidence: 'high',
    };

    const res = validateGeneratedOutput(raw, ['know_unlearning', 'know_projects'], { wordLimit: 50 });
    expect(res.isValid).toBe(true);
    expect(res.canInsertDirectly).toBe(true);
    expect(res.wordCount).toBeGreaterThan(0);
  });

  it('rejects answers that exceed word limit', () => {
    const raw = {
      answer: 'One two three four five six seven eight nine ten',
      usedKnowledgeIds: ['k1'],
      unsupportedClaims: [],
      missingInformation: [],
      confidence: 'high',
    };

    const res = validateGeneratedOutput(raw, ['k1'], { wordLimit: 5 });
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('exceeds word limit');
  });

  it('blocks direct insertion if unsupported claims exist', () => {
    const raw = {
      answer: 'I deployed a national cybersecurity defense system.',
      usedKnowledgeIds: ['k1'],
      unsupportedClaims: ['Deployment of national cybersecurity defense system'],
      missingInformation: [],
      confidence: 'medium',
    };

    const res = validateGeneratedOutput(raw, ['k1'], {});
    expect(res.isValid).toBe(true);
    expect(res.canInsertDirectly).toBe(false);
  });

  it('flags unapproved knowledge IDs not in selected context', () => {
    const raw = {
      answer: 'Some answer',
      usedKnowledgeIds: ['unauthorized_id'],
      unsupportedClaims: [],
      missingInformation: [],
      confidence: 'high',
    };

    const res = validateGeneratedOutput(raw, ['allowed_id'], {});
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain('unauthorized_id');
  });
});
