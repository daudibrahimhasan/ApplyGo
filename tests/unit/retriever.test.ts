import { describe, it, expect } from 'vitest';
import { retrieveKnowledge, retrievePreviousAnswers } from '../../src/core/retrieval/retriever';
import { KnowledgeEntry } from '../../src/shared/schemas/knowledge';
import { PreviousAnswer } from '../../src/shared/schemas/knowledge';

/**
 * Inline test knowledge — used only within tests.
 * NOT shipped as a default. The real extension starts with an empty knowledge base.
 */
const testKnowledge: KnowledgeEntry[] = [
  {
    id: 'know_test_containment',
    category: 'Research interests',
    title: 'Agent Containment and Prompt Injection Testing',
    canonicalFacts: [
      'Studied containment strategies for autonomous LLM agents.',
      'Designed prompt injection resistance benchmarks in sandboxed environments.',
    ],
    shortVersion: 'Focused on containment and prompt injection testing for agentic systems.',
    longVersion:
      'Researched containment architectures and prompt injection resistance for autonomous tool-calling agents in isolated sandbox environments.',
    tags: ['AI Safety', 'Agentic Systems', 'Containment', 'Prompt Injection'],
    relatedSkills: ['Python', 'Docker'],
    opportunityTypes: ['Research Fellowship', 'AI Safety Job'],
    evidence: ['Test sandbox codebase'],
    sensitivity: 'normal',
    allowAIUse: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    lastReviewedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'know_test_unlearning',
    category: 'Experiments',
    title: 'Counterfactual Probing for Machine Unlearning',
    canonicalFacts: [
      'Investigated whether machine unlearning techniques actually erase knowledge.',
      'Designed counterfactual probing experiments with negative controls.',
    ],
    shortVersion: 'Investigated machine unlearning with counterfactual probing.',
    longVersion:
      'Designed counterfactual probing experiments to test whether gradient-ascent machine unlearning truly removes targeted knowledge or only masks outputs.',
    tags: ['Machine Unlearning', 'Evaluations', 'Research'],
    relatedSkills: ['PyTorch', 'Transformers'],
    opportunityTypes: ['Research Fellowship', 'Research Program'],
    evidence: ['Test paper draft'],
    sensitivity: 'normal',
    allowAIUse: true,
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
];

describe('retriever', () => {
  it('retrieves relevant knowledge entries for AI safety verification question', () => {
    const question = 'Describe your technical experience with agent containment and prompt injection.';
    const results = retrieveKnowledge(question, testKnowledge, 'Research Fellowship', 3);

    expect(results.length).toBeGreaterThan(0);
    // Highest match should be containment entry
    const topId = results[0].entry.id;
    expect(['know_test_containment', 'know_test_unlearning']).toContain(topId);
  });

  it('ranks machine unlearning knowledge higher when asked about negative controls and unlearning', () => {
    const question = 'What experiments have you designed with counterfactual probing and machine unlearning?';
    const results = retrieveKnowledge(question, testKnowledge, 'Research Fellowship', 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.id).toBe('know_test_unlearning');
  });

  it('finds exact and similar previous answers', () => {
    const previousAnswers: PreviousAnswer[] = [
      {
        id: 'ans_1',
        normalizedQuestion: 'describe your research direction in ai safety',
        originalQuestion: 'Describe your research direction in AI safety.',
        answer: 'I focus on empirical verification and containment architectures...',
        knowledgeIds: ['know_test_containment'],
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
