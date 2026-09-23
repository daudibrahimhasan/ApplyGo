import { describe, it, expect } from 'vitest';
import { Storage } from '../../src/shared/storage';
import { defaultProfile } from '../../src/shared/storage/defaultProfile';

describe('Storage', () => {
  it('retrieves default profile and persists updates', async () => {
    const profile = await Storage.getProfile();
    expect(profile.personal.firstName).toBe('Daud');

    const updated = {
      ...profile,
      personal: { ...profile.personal, city: 'Oakland' },
    };
    await Storage.saveProfile(updated);

    const reloaded = await Storage.getProfile();
    expect(reloaded.personal.city).toBe('Oakland');
  });

  it('adds and retrieves knowledge entries', async () => {
    const initialKnowledge = await Storage.getKnowledge();
    const count = initialKnowledge.length;

    const newEntry = {
      id: `know_test_${Date.now()}`,
      category: 'Projects',
      title: 'Testing Storage Layer',
      canonicalFacts: ['Verified in-memory fallback'],
      longVersion: 'Testing storage persistence without chrome.storage API.',
      tags: ['Test'],
      relatedSkills: [],
      opportunityTypes: [],
      evidence: [],
      sensitivity: 'normal' as const,
      allowAIUse: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Storage.addKnowledgeEntry(newEntry);
    const updated = await Storage.getKnowledge();
    expect(updated.length).toBe(count + 1);

    await Storage.deleteKnowledgeEntry(newEntry.id);
    const afterDelete = await Storage.getKnowledge();
    expect(afterDelete.length).toBe(count);
  });
});
