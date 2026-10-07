import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parseMarkdownKnowledge, extractProfileFromMarkdown } from '../../src/core/importers/markdownImporter';
import { UserProfileSchema } from '../../src/shared/schemas/profile';
import { defaultProfile } from '../../src/shared/storage/defaultProfile';
import { recoverProfile } from '../../src/shared/storage/recoverProfile';
import { Storage } from '../../src/shared/storage';
import { ensureProfileFromKnowledge } from '../../src/core/importers/profileSync';

describe('knowledge-to-profile recovery', () => {
  it('extracts the bold basic-profile format shown in the screenshot', () => {
    const updates = extractProfileFromMarkdown(`## 1. Basic Profile
**Name:** Daud Ibrahim Hassan
**Country:** Bangladesh
**University:** BRAC University, Dhaka
**Degree:** BSc in Computer Science and Engineering
**Expected graduation:** May 2028
**Email:** [daud@example.com](mailto:daud@example.com)
**LinkedIn:** https://linkedin.com/in/daud
**GitHub:** https://github.com/daud`);
    expect(updates.personal).toMatchObject({ firstName: 'Daud', lastName: 'Ibrahim Hassan', country: 'Bangladesh', email: 'daud@example.com' });
    expect(updates.links).toMatchObject({ linkedin: 'https://linkedin.com/in/daud', github: 'https://github.com/daud' });
    expect(updates.education).toHaveLength(1);
    expect(updates.education![0].school).toBe('BRAC University, Dhaka');
  });
  it('reads inline bold fields and Markdown tables', () => {
    const updates = extractProfileFromMarkdown('**Name:** Alice Smith **Country:** Bangladesh\n| Email | alice@example.com |\n| GitHub | https://github.com/alice |');
    expect(updates.personal).toMatchObject({ firstName: 'Alice', lastName: 'Smith', country: 'Bangladesh', email: 'alice@example.com' });
    expect(updates.links?.github).toBe('https://github.com/alice');
  });
  it('imports the public example KB without producing an invalid duplicate education record', async () => {
    await Storage.clearAllData();
    const markdown = fs.readFileSync('tests/fixtures/sample-knowledge.md', 'utf8');
    const imported = parseMarkdownKnowledge(markdown);
    expect(imported.profileUpdates?.education).toHaveLength(1);
    await Storage.importKnowledge(imported.entries, 'replace');
    await ensureProfileFromKnowledge();
    const reloaded = await Storage.getProfile();
    expect(UserProfileSchema.safeParse(reloaded).success).toBe(true);
    expect(reloaded.personal.firstName).toBe('Alice');
    expect(reloaded.links.linkedin).toContain('example-candidate');
    expect(reloaded.education).toHaveLength(1);
    expect(reloaded.personal.email).toBe('');
  });
  it('salvages valid contact details and education from an old malformed profile', () => {
    const goodEducation = { id: 'valid', school: 'BRAC', degree: 'BSc', fieldOfStudy: 'CSE', current: true, achievements: [] };
    const recovered = recoverProfile({ ...defaultProfile,
      personal: { ...defaultProfile.personal, firstName: 'Daud', email: 'daud@example.com', phone: 123 },
      links: { ...defaultProfile.links, github: 'https://github.com/daud' },
      education: [goodEducation, { id: 'invalid', school: 'BRAC', degree: '', fieldOfStudy: '' }],
    });
    expect(recovered.personal.firstName).toBe('Daud');
    expect(recovered.personal.email).toBe('daud@example.com');
    expect(recovered.links.github).toBe('https://github.com/daud');
    expect(recovered.education).toHaveLength(1);
    expect(UserProfileSchema.safeParse(recovered).success).toBe(true);
  });
  it('recovers from already stored canonical facts without overwriting manual values', async () => {
    await Storage.clearAllData();
    await Storage.saveProfile({ ...defaultProfile, personal: { ...defaultProfile.personal, firstName: 'Manual name' } });
    const entry = parseMarkdownKnowledge('## Basic Profile\n**Name:** Alice Smith\n**Email:** alice@example.com').entries[0];
    await Storage.saveKnowledge([{ ...entry, longVersion: '', canonicalFacts: ['**Name:** Alice Smith', '**Email:** alice@example.com'] }]);
    await ensureProfileFromKnowledge();
    const profile = await Storage.getProfile();
    expect(profile.personal.firstName).toBe('Manual name');
    expect(profile.personal.lastName).toBe('Smith');
    expect(profile.personal.email).toBe('alice@example.com');
  });
  it('does not invent missing education fields or contact values', () => {
    const updates = extractProfileFromMarkdown('## Profile\n**Name:** Alice Smith\n**Email:** Not provided\n**University:** BRAC\n## Future goals\n**Degree:** MSc');
    expect(updates.personal?.email).toBeUndefined();
    expect(updates.education).toBeUndefined();
  });
  it('rejects invalid new saves instead of destroying the last valid profile', async () => {
    await Storage.clearAllData();
    await Storage.saveProfile({ ...defaultProfile, personal: { ...defaultProfile.personal, firstName: 'Alice' } });
    await expect(Storage.saveProfile({ ...defaultProfile, education: [{ id: 'broken', school: '', degree: '', fieldOfStudy: '', current: false, achievements: [] }] })).rejects.toThrow();
    expect((await Storage.getProfile()).personal.firstName).toBe('Alice');
  });
});
