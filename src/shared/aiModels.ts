export const GEMINI_TEXT_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (best quality)' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (balanced)' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (fastest/cheapest)' },
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_TEXT_MODELS[0].id;

export function normalizeGeminiModel(baseUrl: string, model: string): string {
  if (!baseUrl.includes('generativelanguage.googleapis.com')) return model;
  if (/^gemini-(?:1\.5|2\.0)(?:-|$)/i.test(model)) return DEFAULT_GEMINI_MODEL;
  return model || DEFAULT_GEMINI_MODEL;
}
