import { describe, expect, it } from 'vitest';
import { ensureProfileFromKnowledge } from '../../src/core/importers/profileSync';
import { Storage } from '../../src/shared/storage';

describe('ensureProfileFromKnowledge', () => {
  it('recovers an empty profile from previously imported knowledge', async () => {
    await Storage.clearAllData();
    await Storage.importKnowledge(
      [
        {
          id: 'know_identity',
          category: 'Background',
          title: 'Personal identity',
          canonicalFacts: ['Full name: Daud Ibrahim Hassan', 'Location: Dhaka, Bangladesh'],
          longVersion: '- Full name: Daud Ibrahim Hassan\n- Location: Dhaka, Bangladesh',
          tags: [],
          relatedSkills: [],
          opportunityTypes: [],
          evidence: [],
          sensitivity: 'personal',
          allowAIUse: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      'replace'
    );

    const profile = await ensureProfileFromKnowledge();

    expect(profile.personal.firstName).toBe('Daud');
    expect(profile.personal.lastName).toBe('Ibrahim Hassan');
    expect(profile.personal.city).toBe('Dhaka');
    expect(profile.personal.country).toBe('Bangladesh');
  });

  it('backfills missing contact details even when the name already exists', async () => {
    await Storage.clearAllData();
    const current = await Storage.getProfile();
    await Storage.saveProfile({
      ...current,
      personal: { ...current.personal, firstName: 'Daud', lastName: 'Ibrahim Hassan' },
    });
    await Storage.importKnowledge(
      [
        {
          id: 'know_contact',
          category: 'Background',
          title: 'Contact details',
          canonicalFacts: [],
          longVersion: '- Email: daud@example.com\n- LinkedIn URL: https://linkedin.com/in/daud\n- GitHub URL: https://github.com/daud',
          tags: [], relatedSkills: [], opportunityTypes: [], evidence: [],
          sensitivity: 'personal', allowAIUse: true,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
      ],
      'replace'
    );

    const profile = await ensureProfileFromKnowledge();

    expect(profile.personal.email).toBe('daud@example.com');
    expect(profile.links.linkedin).toBe('https://linkedin.com/in/daud');
    expect(profile.links.github).toBe('https://github.com/daud');
  });
});
