import { z } from 'zod';
import { UserProfile, UserProfileSchema } from '../schemas/profile';
import { defaultProfile } from './defaultProfile';

/** Salvage valid fields independently; one broken array record must not empty the profile. */
export function recoverProfile(raw: unknown): UserProfile {
  const recovered = JSON.parse(JSON.stringify(defaultProfile)) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') return UserProfileSchema.parse(recovered);
  const source = raw as Record<string, unknown>;
  for (const [key, schema] of Object.entries(UserProfileSchema.shape)) {
    const parsed = schema.safeParse(source[key]);
    if (parsed.success) {
      recovered[key] = parsed.data;
      continue;
    }
    const inner = schema instanceof z.ZodDefault ? schema.removeDefault() : schema;
    if (inner instanceof z.ZodArray && Array.isArray(source[key])) {
      recovered[key] = (source[key] as unknown[]).flatMap((record) => {
        const item = inner.element.safeParse(record);
        return item.success ? [item.data] : [];
      });
    } else if (inner instanceof z.ZodObject && source[key] && typeof source[key] === 'object') {
      const values = { ...(recovered[key] as Record<string, unknown>) };
      for (const [field, validator] of Object.entries(inner.shape)) {
        const value = (validator as z.ZodTypeAny).safeParse((source[key] as Record<string, unknown>)[field]);
        if (value.success) values[field] = value.data;
      }
      recovered[key] = values;
    }
  }
  return UserProfileSchema.parse(recovered);
}
