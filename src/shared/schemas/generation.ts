import { z } from 'zod';

export const GeneratedAnswerSchema = z.object({
  answer: z.string(),
  usedKnowledgeIds: z.array(z.string()).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type GeneratedAnswer = z.infer<typeof GeneratedAnswerSchema>;

export const GenerationRequestSchema = z.object({
  questionId: z.string(),
  questionText: z.string().min(1),
  instructions: z.string().optional(),
  wordLimit: z.number().optional(),
  characterLimit: z.number().optional(),
  organization: z.string().optional(),
  opportunity: z.string().optional(),
  opportunityType: z.string().optional(),
  selectedKnowledgeIds: z.array(z.string()).default([]),
  selectedPreviousAnswerId: z.string().optional(),
  currentDraft: z.string().optional(),
  mode: z.enum(['draft', 'rewrite', 'shorten', 'expand', 'adapt']).default('draft'),
});
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
