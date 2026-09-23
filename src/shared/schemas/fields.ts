import { z } from 'zod';

export const FieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  id: z.string().optional(),
});
export type FieldOption = z.infer<typeof FieldOptionSchema>;

export const InputTypeEnum = z.enum([
  'text',
  'email',
  'tel',
  'url',
  'number',
  'date',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'file',
  'combobox',
]);
export type InputType = z.infer<typeof InputTypeEnum>;

export const FieldSensitivityEnum = z.enum(['safe', 'sensitive', 'blocked']);
export type FieldSensitivity = z.infer<typeof FieldSensitivityEnum>;

export const MatchConfidenceEnum = z.enum(['high', 'medium', 'low', 'blocked']);
export type MatchConfidence = z.infer<typeof MatchConfidenceEnum>;

export const FillStateEnum = z.enum([
  'unfilled',
  'matched',
  'review',
  'filled',
  'failed',
  'user_modified',
  'blocked',
]);
export type FillState = z.infer<typeof FillStateEnum>;

export const DetectedFieldSchema = z.object({
  id: z.string(),
  selector: z.string(),
  inputType: InputTypeEnum,
  label: z.string().default(''),
  placeholder: z.string().default(''),
  name: z.string().default(''),
  domId: z.string().default(''),
  ariaLabel: z.string().default(''),
  ariaDescription: z.string().default(''),
  nearbyInstructions: z.string().default(''),
  sectionHeading: z.string().default(''),
  options: z.array(FieldOptionSchema).default([]),
  required: z.boolean().default(false),
  currentValue: z.string().default(''),
  characterLimit: z.number().optional(),
  wordLimit: z.number().optional(),
  visibility: z.boolean().default(true),
  disabled: z.boolean().default(false),
  sensitivity: FieldSensitivityEnum.default('safe'),
  proposedProfileKey: z.string().optional(),
  proposedValue: z.string().optional(),
  matchReason: z.string().optional(),
  confidence: MatchConfidenceEnum.default('low'),
  fillState: FillStateEnum.default('unfilled'),
});
export type DetectedField = z.infer<typeof DetectedFieldSchema>;

export const PageOpportunitySchema = z.object({
  organization: z.string().default(''),
  opportunityName: z.string().default(''),
  opportunityType: z.string().default('General Opportunity'),
  url: z.string().default(''),
  detectedPlatform: z.string().default('standard'),
});
export type PageOpportunity = z.infer<typeof PageOpportunitySchema>;

export const FillTransactionSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  entries: z.array(
    z.object({
      fieldId: z.string(),
      selector: z.string(),
      previousValue: z.string(),
      filledValue: z.string(),
      success: z.boolean(),
    })
  ),
});
export type FillTransaction = z.infer<typeof FillTransactionSchema>;
