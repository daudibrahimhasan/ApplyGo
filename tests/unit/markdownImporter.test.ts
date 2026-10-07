import { describe, it, expect } from 'vitest';
import { parseMarkdownKnowledge, normalizeCategory } from '../../src/core/importers/markdownImporter';
import * as fs from 'fs';
import * as path from 'path';

describe('markdownImporter', () => {
  it('normalizes categories appropriately', () => {
    expect(normalizeCategory('Identity')).toBe('Background');
    expect(normalizeCategory('Education')).toBe('Background');
    expect(normalizeCategory('Experience')).toBe('Technical experience');
    expect(normalizeCategory('Skills')).toBe('Technical experience');
    expect(normalizeCategory('Research methods')).toBe('Research interests');
    expect(normalizeCategory('Engineering projects')).toBe('Projects');
    expect(normalizeCategory('Long-term goal')).toBe('Career goals');
  });

  it('parses generic markdown into discrete KnowledgeEntry records', () => {
    const md = `
# My Research Notes

## Project Alpha
**Category:** Projects
**Status:** Completed

- Built a custom transformer in PyTorch
- Evaluated on 500 test traces

This is the long detailed description of Project Alpha.

## AI Safety Interests
**Category:** Research interests
**Status:** Active

- Mechanistic interpretability
- Causal tracing in large language models
`;

    const result = parseMarkdownKnowledge(md);
    expect(result.documentTitle).toBe('My Research Notes');
    expect(result.totalSections).toBe(2);
    expect(result.entries.length).toBe(2);

    const alpha = result.entries[0];
    expect(alpha.title).toBe('Project Alpha');
    expect(alpha.category).toBe('Projects');
    expect(alpha.canonicalFacts).toHaveLength(2);
    expect(alpha.canonicalFacts[0]).toBe('Built a custom transformer in PyTorch');
    expect(alpha.tags).toContain('Completed');
    expect(alpha.tags).toContain('Projects');

    const safety = result.entries[1];
    expect(safety.title).toBe('AI Safety Interests');
    expect(safety.category).toBe('Research interests');
    expect(safety.canonicalFacts).toHaveLength(2);
    expect(safety.tags).toContain('Active');
  });

  it('parses the public example knowledge base accurately', () => {
    const kbPath = path.resolve(__dirname, '../fixtures/sample-knowledge.md');
    const content = fs.readFileSync(kbPath, 'utf-8');

    const result = parseMarkdownKnowledge(content);
    expect(result.documentTitle).toBe('Example Candidate: ApplyGo Knowledge Base');
    expect(result.entries.length).toBe(6);

    // Check identity entry
    const identity = result.entries.find((e) => e.id.includes('kb_identity_001'));
    expect(identity).toBeDefined();
    expect(identity?.title).toBe('Personal identity');
    expect(identity?.category).toBe('Background');
    expect(identity?.canonicalFacts.some((f) => f.includes('Alice Smith'))).toBe(true);
    expect(identity?.sensitivity).toBe('personal');

    // Check tech stack entry
    const tech = result.entries.find((e) => e.id.includes('kb_tech_001'));
    expect(tech).toBeDefined();
    expect(tech?.title).toBe('Technical stack');
    expect(tech?.category).toBe('Technical experience');
    expect(tech?.canonicalFacts).toContain('Python');
    expect(tech?.canonicalFacts).toContain('PyTorch');

    // Check project entry
    const falseContainment = result.entries.find((e) => e.id.includes('kb_project_001'));
    expect(falseContainment).toBeDefined();
    expect(falseContainment?.title).toBe('Evaluation toolkit');
    expect(falseContainment?.category).toBe('Projects');

    // Check profile auto-detection
    expect(result.profileUpdates).toBeDefined();
    expect(result.profileUpdates?.personal?.firstName).toBe('Alice');
    expect(result.profileUpdates?.personal?.city).toBe('Example City');
    expect(result.profileUpdates?.personal?.country).toBe('Example Country');
    expect(result.profileUpdates?.links?.linkedin).toBe(
      'https://www.linkedin.com/in/example-candidate',
    );
    expect(result.profileUpdates?.links?.github).toBe(
      'https://github.com/example-candidate',
    );
    expect(result.profileUpdates?.skills).toContain('Python');
    expect(result.profileUpdates?.skills).toContain('PyTorch');
    expect(result.profileUpdates?.education?.[0]?.school).toBe('Example University');
  });

  it('handles empty or blank markdown gracefully', () => {
    const result = parseMarkdownKnowledge('');
    expect(result.entries).toEqual([]);
    expect(result.totalSections).toBe(0);
  });

  it('extracts only explicit profile contact details and links', () => {
    const md = `
# Candidate Knowledge

## Personal identity
- Full name: Daud Ibrahim Hassan
- Email: daud@example.com
- Phone: +880 1234 567890
- Pronouns: he/him
- LinkedIn URL: [LinkedIn](https://www.linkedin.com/in/daud-example)
- GitHub: <https://github.com/daud-example>
`;

    const result = parseMarkdownKnowledge(md);
    expect(result.profileUpdates?.personal).toMatchObject({
      firstName: 'Daud',
      lastName: 'Ibrahim Hassan',
      email: 'daud@example.com',
      phone: '+880 1234 567890',
      pronouns: 'he/him',
    });
    expect(result.profileUpdates?.links).toMatchObject({
      linkedin: 'https://www.linkedin.com/in/daud-example',
      github: 'https://github.com/daud-example',
    });
    expect(result.profileUpdates?.links?.portfolio).toBeUndefined();
  });
});
