import { describe, it, expect } from 'vitest';
import { retrieveKnowledge, retrievePreviousAnswers } from '../../src/core/retrieval/retriever';
import { defaultKnowledge } from '../../src/shared/storage/defaultKnowledge';
import { PreviousAnswer } from '../../src/shared/schemas/knowledge';

describe('retriever', () => {
  it('retrieves relevant knowledge entries for AI safety verification question', () => {
    const question = 'Describe your technical experience with agent containment and prompt injection.';
    const results = retrieveKnowledge(question, defaultKnowledge, 'Research Fellowship', 3);

    expect(results.length).toBeGreaterThan(0);
    // Highest match should be AgentContain or Verification
    const topId = results[0].entry.id;
    expect(['know_agent_contain', 'know_research_interests']).toContain(topId);
  });

  it('ranks machine unlearning knowledge higher when asked about negative controls and unlearning', () => {
    const question = 'What experiments have you designed with counterfactual probing and machine unlearning?';
    const results = retrieveKnowledge(question, defaultKnowledge, 'Research Fellowship', 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.id).toBe('know_unlearning_research');
  });

  it('finds exact and similar previous answers', () => {
    const previousAnswers: PreviousAnswer[] = [
      {
        id: 'ans_1',
        normalizedQuestion: 'describe your research direction in ai safety',
        originalQuestion: 'Describe your research direction in AI safety.',
        answer: 'I focus on empirical verification and containment architectures...',
        knowledgeIds: ['know_research_interests'],
        approvedByUser: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    const exactMatch = retrievePreviousAnswers('Describe your research direction in AI safety.', previousAnswers);
    expect(exactMatch.length).toBe(1);
    expect(exactMatch[0].isExactMatch).toBe(true);
    expect(exactMatch[0].similarityScore).toBe(100);

    const partialMatch = retrievePreviousAnswers('What is your research direction?', previousAnswers);
    expect(partialMatch.length).toBe(1);
    expect(partialMatch[0].isExactMatch).toBe(false);
  });
});
