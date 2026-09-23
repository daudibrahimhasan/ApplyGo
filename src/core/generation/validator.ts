import { GeneratedAnswer, GeneratedAnswerSchema } from '../../shared/schemas/generation';

export interface OutputValidationResult {
  isValid: boolean;
  data?: GeneratedAnswer;
  errors: string[];
  wordCount: number;
  characterCount: number;
  canInsertDirectly: boolean;
}

export function validateGeneratedOutput(
  rawJson: unknown,
  allowedKnowledgeIds: string[],
  constraints: { wordLimit?: number; characterLimit?: number }
): OutputValidationResult {
  const errors: string[] = [];

  // 1. Validate against Zod schema
  const parsed = GeneratedAnswerSchema.safeParse(rawJson);
  if (!parsed.success) {
    return {
      isValid: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      wordCount: 0,
      characterCount: 0,
      canInsertDirectly: false,
    };
  }

  const data = parsed.data;
  const answer = data.answer.trim();
  const characterCount = answer.length;
  const wordCount = answer.length > 0 ? answer.split(/\s+/).filter(Boolean).length : 0;

  // 2. Check non-empty
  if (!answer) {
    errors.push('Generated answer is empty.');
  }

  // 3. Check for HTML tags
  if (/<[a-z][\s\S]*>/i.test(answer)) {
    errors.push('Generated answer contains unexpected HTML tags.');
  }

  // 4. Check for leaked JSON or prompt instruction echoes
  if (/^\{[\s\S]*\}$/.test(answer) || /^```json[\s\S]*```$/i.test(answer)) {
    errors.push('Generated answer appears to contain raw JSON code instead of prose.');
  }
  if (/^(draft:|answer:|response:)/i.test(answer)) {
    errors.push('Generated answer contains unnecessary draft prefixes.');
  }

  // 5. Length limit checks
  if (constraints.wordLimit && wordCount > constraints.wordLimit) {
    errors.push(`Answer exceeds word limit (${wordCount} words > ${constraints.wordLimit} max).`);
  }
  if (constraints.characterLimit && characterCount > constraints.characterLimit) {
    errors.push(`Answer exceeds character limit (${characterCount} chars > ${constraints.characterLimit} max).`);
  }

  // 6. Verify knowledge IDs are within allowed subset
  const allowedSet = new Set(allowedKnowledgeIds);
  for (const id of data.usedKnowledgeIds) {
    if (!allowedSet.has(id)) {
      errors.push(`Referenced knowledge ID "${id}" was not provided in selected context.`);
    }
  }

  const isValid = errors.length === 0;

  // Determination for direct insertion eligibility
  const canInsertDirectly =
    isValid &&
    data.confidence !== 'low' &&
    data.unsupportedClaims.length === 0 &&
    data.missingInformation.length === 0;

  return {
    isValid,
    data,
    errors,
    wordCount,
    characterCount,
    canInsertDirectly,
  };
}
