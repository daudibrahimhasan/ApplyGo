import { z } from 'zod';

export const KnowledgeCategoryEnum = z.enum([
  'Background',
  'Research interests',
  'Research direction',
  'Projects',
  'Experiments',
  'Technical experience',
  'Leadership',
  'Motivation',
  'Challenges',
  'Career goals',
  'AI safety interests',
  'Previous application answers',
  'Writing samples',
  'Custom',
]);
export type KnowledgeCategory = z.infer<typeof KnowledgeCategoryEnum>;

export const KnowledgeEntrySchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string().min(1, 'Title is required'),
  canonicalFacts: z.array(z.string()).default([]),
  shortVersion: z.string().optional(),
  longVersion: z.string().min(1, 'Long version content is required'),
  tags: z.array(z.string()).default([]),
  relatedSkills: z.array(z.string()).default([]),
  opportunityTypes: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  source: z.string().optional(),
  sensitivity: z.enum(['normal', 'personal', 'sensitive']).default('normal'),
  allowAIUse: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastReviewedAt: z.string().optional(),
});
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

export const PreviousAnswerSchema = z.object({
  id: z.string(),
  normalizedQuestion: z.string(),
  originalQuestion: z.string().min(1, 'Original question is required'),
  answer: z.string().min(1, 'Answer is required'),
  organization: z.string().optional(),
  opportunity: z.string().optional(),
  opportunityType: z.string().optional(),
  knowledgeIds: z.array(z.string()).default([]),
  approvedByUser: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedAt: z.string().optional(),
});
export type PreviousAnswer = z.infer<typeof PreviousAnswerSchema>;
