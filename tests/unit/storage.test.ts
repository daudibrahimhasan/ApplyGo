import { describe, it, expect } from 'vitest';
import { Storage } from '../../src/shared/storage';

describe('Storage', () => {
  it('preserves saved Gemini model settings and API key', async () => {
    await Storage.clearAllData();
    await Storage.saveSettings({
      apiKey: 'test-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      model: 'gemini-1.5-flash',
    });

    const settings = await Storage.getSettings();

    expect(settings.model).toBe('gemini-3.8-flash');
    expect(settings.apiKey).toBe('test-key');
  });

  it('retrieves default profile and persists updates', async () => {
    const profile = await Storage.getProfile();
    expect(profile.personal.firstName).toBe('');
    expect(profile.authorization.workAuthUS).toBeNull();
    expect(profile.authorization.requiresSponsorshipUS).toBeNull();
    expect(profile.authorization.workAuthUK).toBeNull();
    expect(profile.authorization.requiresSponsorshipUK).toBeNull();
    expect(profile.authorization.workAuthEU).toBeNull();
    expect(profile.authorization.requiresSponsorshipEU).toBeNull();
    expect(profile.availability.fullTime).toBeNull();
    expect(profile.availability.remotePreference).toBeNull();

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

  it('imports knowledge entries in merge and replace modes', async () => {
    const entry1 = {
      id: 'know_batch_1',
      category: 'Projects',
      title: 'Batch Project 1',
      canonicalFacts: ['Fact A'],
      longVersion: 'Description 1',
      tags: ['Batch'],
      relatedSkills: [],
      opportunityTypes: [],
      evidence: [],
      sensitivity: 'normal' as const,
      allowAIUse: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const entry2 = {
      id: 'know_batch_2',
      category: 'Research interests',
      title: 'Batch Project 2',
      canonicalFacts: ['Fact B'],
      longVersion: 'Description 2',
      tags: ['Batch'],
      relatedSkills: [],
      opportunityTypes: [],
      evidence: [],
      sensitivity: 'normal' as const,
      allowAIUse: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const merged = await Storage.importKnowledge([entry1, entry2], 'merge');
    expect(merged.some((e) => e.id === 'know_batch_1')).toBe(true);
    expect(merged.some((e) => e.id === 'know_batch_2')).toBe(true);

    const replaced = await Storage.importKnowledge([entry1], 'replace');
    expect(replaced.length).toBe(1);
    expect(replaced[0].id).toBe('know_batch_1');
  });

  it('applies partial profile updates safely without overwriting unaffected fields', async () => {
    const original = await Storage.getProfile();
    const updated = await Storage.updateProfilePartial({
      personal: { firstName: 'Daud', lastName: 'Hassan' },
      skills: ['Python', 'PyTorch'],
      links: { github: 'https://github.com/daud-example' },
    });

    expect(updated.personal.firstName).toBe('Daud');
    expect(updated.personal.lastName).toBe('Hassan');
    expect(updated.skills).toContain('Python');
    expect(updated.links.github).toBe('https://github.com/daud-example');
    // Ensure untouched fields like authorization remain intact
    expect(updated.authorization.workAuthUS).toBe(original.authorization.workAuthUS);
  });
});
