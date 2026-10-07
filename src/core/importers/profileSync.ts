import { Storage } from '../../shared/storage';
import { UserProfile } from '../../shared/schemas/profile';
import { extractProfileFromMarkdown } from './markdownImporter';

/** Recover an empty profile from knowledge entries imported by older builds. */
export async function ensureProfileFromKnowledge(): Promise<UserProfile> {
  const current = await Storage.getProfile();
  const knowledge = await Storage.getKnowledge();
  const reconstructedMarkdown = knowledge
    .map((entry) => `## ${entry.title}\n${entry.longVersion || ''}\n${(entry.canonicalFacts || []).map((fact) => `- ${fact}`).join('\n')}`)
    .join('\n\n');
  const extracted = extractProfileFromMarkdown(reconstructedMarkdown);
  const updates = {
    personal: Object.fromEntries(
      Object.entries(extracted.personal || {}).filter(
        ([key, value]) => value && !current.personal[key as keyof UserProfile['personal']]
      )
    ),
    links: Object.fromEntries(
      Object.entries(extracted.links || {}).filter(
        ([key, value]) => value && !current.links[key as keyof UserProfile['links']]
      )
    ),
    education: current.education.length === 0 ? extracted.education : undefined,
    skills: extracted.skills,
  };

  const hasUpdates =
    Object.keys(updates.personal).length > 0 ||
    Object.keys(updates.links).length > 0 ||
    Boolean(updates.education?.length) ||
    Boolean(updates.skills?.length);
  if (!hasUpdates) return current;
  return Storage.updateProfilePartial(updates);
}
