import { z } from 'zod';

export const ExtensionSettingsSchema = z.object({
  apiKey: z.string().default(''),
  baseUrl: z.string().default('https://api.openai.com/v1'),
  model: z.string().default('gpt-4o'),
  requestTimeoutMs: z.number().default(45000),
  temperature: z.number().min(0).max(2).optional(),
  autoDetectForms: z.boolean().default(true),
  showFloatingLauncher: z.boolean().default(true),
  highlightFilledFields: z.boolean().default(true),
  fillDelayMs: z.number().default(40),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
});
export type ExtensionSettings = z.infer<typeof ExtensionSettingsSchema>;

export const BackupDataSchema = z.object({
  version: z.literal('1.0.0'),
  exportedAt: z.string(),
  profile: z.any(),
  knowledge: z.array(z.any()),
  previousAnswers: z.array(z.any()),
  applications: z.array(z.any()),
  settings: z.object({
    baseUrl: z.string(),
    model: z.string(),
    autoDetectForms: z.boolean(),
    showFloatingLauncher: z.boolean(),
    highlightFilledFields: z.boolean(),
  }),
});
export type BackupData = z.infer<typeof BackupDataSchema>;
