import { KnowledgeEntry } from '../../shared/schemas/knowledge';
import { EducationRecord, ProfilePartialUpdate } from '../../shared/schemas/profile';

export type MarkdownProfileUpdates = ProfilePartialUpdate;

export interface MarkdownImportResult {
  entries: KnowledgeEntry[];
  profileUpdates?: MarkdownProfileUpdates;
  documentTitle?: string;
  totalSections: number;
}

/**
 * Normalizes a category string to one of the standard ApplyGo knowledge categories
 * or preserves a clean capitalized representation.
 */
export function normalizeCategory(categoryStr?: string, titleHint?: string): string {
  if (!categoryStr && titleHint) {
    const lowerTitle = titleHint.toLowerCase();
    if (lowerTitle.includes('project')) return 'Projects';
    if (lowerTitle.includes('research') && lowerTitle.includes('interest')) return 'Research interests';
    if (lowerTitle.includes('research')) return 'Research direction';
    if (lowerTitle.includes('experiment')) return 'Experiments';
    if (lowerTitle.includes('skill') || lowerTitle.includes('stack') || lowerTitle.includes('engineering') || lowerTitle.includes('method')) return 'Technical experience';
    if (lowerTitle.includes('goal') || lowerTitle.includes('career') || lowerTitle.includes('strategy')) return 'Career goals';
    if (lowerTitle.includes('education') || lowerTitle.includes('identity') || lowerTitle.includes('role') || lowerTitle.includes('bio')) return 'Background';
    if (lowerTitle.includes('safety')) return 'AI safety interests';
    if (lowerTitle.includes('challenge')) return 'Challenges';
    if (lowerTitle.includes('motivation')) return 'Motivation';
    if (lowerTitle.includes('leader')) return 'Leadership';
  }

  const raw = (categoryStr || 'Custom').trim();
  const lower = raw.toLowerCase();

  if (lower.includes('identity') || lower.includes('background') || lower.includes('education') || lower.includes('bio')) {
    return 'Background';
  }
  if (lower.includes('research interest') || lower.includes('research method') || lower.includes('research identity')) {
    return 'Research interests';
  }
  if (lower.includes('research direction') || lower.includes('research goal')) {
    return 'Research direction';
  }
  if (lower.includes('project')) {
    return 'Projects';
  }
  if (lower.includes('experiment')) {
    return 'Experiments';
  }
  if (lower.includes('skill') || lower.includes('tech') || lower.includes('experience') || lower.includes('engineering')) {
    return 'Technical experience';
  }
  if (lower.includes('career') || lower.includes('goal') || lower.includes('strategy') || lower.includes('future')) {
    return 'Career goals';
  }
  if (lower.includes('motivation')) {
    return 'Motivation';
  }
  if (lower.includes('challenge')) {
    return 'Challenges';
  }
  if (lower.includes('leadership')) {
    return 'Leadership';
  }
  if (lower.includes('safety')) {
    return 'AI safety interests';
  }

  return raw;
}

/**
 * Parses markdown text (such as daud-knowledge-base.md or any user notes)
 * into discrete, structured KnowledgeEntry records.
 */
export function parseMarkdownKnowledge(markdown: string): MarkdownImportResult {
  if (!markdown || !markdown.trim()) {
    return { entries: [], totalSections: 0 };
  }

  const lines = markdown.split(/\r?\n/);
  let documentTitle = '';

  // Check for top-level H1 document title
  const h1Match = lines.find((l) => /^#\s+([^#].*)$/.test(l));
  if (h1Match) {
    documentTitle = h1Match.replace(/^#\s+/, '').trim();
  }

  // Split content by H2 headers (## Header), or fallback to H1 if no H2s exist
  const hasH2 = lines.some((l) => /^##\s+/.test(l));
  const headerRegex = hasH2 ? /^##\s+(.+)$/ : /^#\s+(.+)$/;

  interface RawSection {
    header: string;
    lines: string[];
  }

  const sections: RawSection[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(headerRegex);
    if (match) {
      if (currentHeader || currentLines.some((l) => l.trim().length > 0)) {
        sections.push({ header: currentHeader, lines: currentLines });
      }
      currentHeader = match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeader || currentLines.some((l) => l.trim().length > 0)) {
    sections.push({ header: currentHeader, lines: currentLines });
  }

  const entries: KnowledgeEntry[] = [];
  let index = 0;

  for (const section of sections) {
    if (!section.header) continue;

    index++;
    const headerText = section.header;
    const bodyText = section.lines.join('\n').trim();
    if (!bodyText && !headerText) continue;

    // Parse identifier and title if formatted like "KB-IDENTITY-001: Personal identity"
    let idSlug = '';
    let cleanTitle = headerText;
    const kbIdMatch = headerText.match(/^([A-Za-z0-9_-]+)\s*[:\-–—]\s*(.*)$/);
    if (kbIdMatch) {
      idSlug = kbIdMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      cleanTitle = kbIdMatch[2].trim() || kbIdMatch[1];
    } else {
      idSlug = headerText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30);
    }

    // Extract metadata from section lines (e.g. **Category:** ..., **Status:** ..., **Allowed use:** ...)
    let rawCategory: string | undefined;
    let rawStatus: string | undefined;
    let allowedUse: string | undefined;
    const extractedTags: string[] = [];
    const canonicalFacts: string[] = [];

    for (const l of section.lines) {
      const trimmed = l.trim();
      if (!trimmed) continue;

      // Check for Category metadata
      const catMatch = trimmed.match(/^\*\*Category:\*\*\s*(.*)$/i) || trimmed.match(/^Category:\s*(.*)$/i);
      if (catMatch) {
        rawCategory = catMatch[1].trim();
        continue;
      }

      // Check for Status metadata
      const statusMatch = trimmed.match(/^\*\*Status:\*\*\s*(.*)$/i) || trimmed.match(/^Status:\s*(.*)$/i);
      if (statusMatch) {
        rawStatus = statusMatch[1].trim();
        // Extract comma-separated statuses into tags
        rawStatus.split(',').forEach((s) => {
          const t = s.trim();
          if (t) extractedTags.push(t);
        });
        continue;
      }

      // Check for Allowed use metadata
      const useMatch = trimmed.match(/^\*\*Allowed use:\*\*\s*(.*)$/i) || trimmed.match(/^Allowed use:\s*(.*)$/i);
      if (useMatch) {
        allowedUse = useMatch[1].trim();
        continue;
      }

      // Check for Tags metadata
      const tagMatch = trimmed.match(/^\*\*Tags:\*\*\s*(.*)$/i) || trimmed.match(/^Tags:\s*(.*)$/i);
      if (tagMatch) {
        tagMatch[1].split(',').forEach((t) => {
          const tag = t.trim();
          if (tag) extractedTags.push(tag);
        });
        continue;
      }

      // Check for bullet points / facts (- Fact or * Fact or 1. Fact)
      const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/) || trimmed.match(/^\d+\.\s+(.*)$/);
      if (bulletMatch) {
        const fact = bulletMatch[1].trim();
        if (fact && fact.length > 2 && !fact.startsWith('#')) {
          canonicalFacts.push(fact);
        }
      }
    }

    const category = normalizeCategory(rawCategory, cleanTitle);
    if (rawCategory && !extractedTags.includes(rawCategory)) {
      extractedTags.push(rawCategory);
    }
    if (allowedUse) {
      extractedTags.push('Allowed in applications');
    }

    // Determine sensitivity
    let sensitivity: 'normal' | 'personal' | 'sensitive' = 'normal';
    const lowerBody = bodyText.toLowerCase();
    const lowerTitle = cleanTitle.toLowerCase();
    if (
      lowerTitle.includes('identity') ||
      lowerTitle.includes('personal') ||
      lowerTitle.includes('contact') ||
      category === 'Background' ||
      lowerBody.includes('full name') ||
      lowerBody.includes('phone')
    ) {
      sensitivity = 'personal';
    } else if (lowerTitle.includes('sensitive') || lowerTitle.includes('credential')) {
      sensitivity = 'sensitive';
    }

    const entryId = idSlug ? `know_${idSlug}` : `know_entry_${Date.now()}_${index}`;

    entries.push({
      id: entryId,
      category,
      title: cleanTitle,
      canonicalFacts: canonicalFacts.slice(0, 20),
      longVersion: bodyText,
      tags: Array.from(new Set(extractedTags)),
      relatedSkills: [],
      opportunityTypes: [],
      evidence: [],
      source: documentTitle || 'Markdown Import',
      sensitivity,
      allowAIUse: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Also extract candidate profile details if present
  const profileUpdates = extractProfileFromMarkdown(markdown);

  return {
    entries,
    profileUpdates: Object.keys(profileUpdates).length > 0 ? profileUpdates : undefined,
    documentTitle,
    totalSections: entries.length,
  };
}

/**
 * Extracts structured profile fields (Personal info, Education, Skills)
 * from Markdown notes if structured sections exist.
 */
export function extractProfileFromMarkdown(markdown: string): MarkdownProfileUpdates {
  const updates: MarkdownProfileUpdates = {};
  // Handle bold labels, numbered bullets, table rows, and labels written on one line.
  const lines = markdown.replace(/([^\n])\s+(?=\*\*[A-Za-z][^*\n]{0,40}:\*\*)/g, '$1\n').split(/\r?\n/);
  const personal: NonNullable<ProfilePartialUpdate['personal']> = {};
  const links: NonNullable<ProfilePartialUpdate['links']> = {};
  const skillsList: string[] = [];
  const educationList: EducationRecord[] = [];
  let education: { school?: string; degree?: string; fieldOfStudy?: string; endDate?: string } = {};
  let inSkills = false;

  const cleanValue = (value: string): string => {
    const text = value.trim().replace(/^<|>$/g, '');
    const link = text.match(/^\[[^\]]+\]\(([^)]+)\)$/);
    return (link?.[1] || text).replace(/^mailto:/i, '').trim();
  };
  const labeledValue = (line: string, labels: string[]): string | undefined => {
    const normalized = line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '')
      .replace(/\*\*|__/g, '').trim();
    const table = normalized.match(/^\|\s*([^|]+)\|\s*([^|]+)\|/);
    const plain = table ? `${table[1].trim().replace(/:$/, '')}: ${table[2].trim()}` : normalized;
    for (const label of labels) {
      const match = plain.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, 'i'));
      if (match) {
        const value = cleanValue(match[1]);
        if (!/^(unknown|not (?:provided|specified|available)|n\/?a|tbd|pending|-)$/i.test(value)) return value;
      }
    }
    return undefined;
  };
  const flushEducation = () => {
    // Incomplete education must never invalidate an otherwise usable contact profile.
    if (education.school && education.degree &&
        !educationList.some((item) => item.school === education.school && item.degree === education.degree)) {
      educationList.push({
        id: `edu_md_${Date.now()}_${educationList.length}`,
        school: education.school, degree: education.degree,
        fieldOfStudy: education.fieldOfStudy || (education.degree.includes(' in ') ? education.degree.split(' in ').slice(1).join(' in ') : ''),
        current: true, endDate: education.endDate, achievements: [],
      });
    }
    education = {};
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (/^#{1,6}\s/.test(line)) {
      flushEducation();
      inSkills = /(?:technical\s+stack|skills)\b/i.test(line);
    }
    const name = labeledValue(line, ['Full name', 'Name', 'Legal name']);
    if (name) {
      const parts = name.split(/\s+/);
      personal.firstName = parts[0];
      personal.lastName = parts.slice(1).join(' ');
    }
    const personalLabels: Array<[keyof typeof personal, string[]]> = [
      ['firstName', ['First name', 'Given name']], ['lastName', ['Last name', 'Surname']],
      ['email', ['Email', 'Email address']], ['phone', ['Phone', 'Phone number', 'Mobile']],
      ['pronouns', ['Pronouns']], ['city', ['City', 'Current city']],
      ['region', ['State', 'Region', 'Province']], ['country', ['Country']], ['timezone', ['Timezone', 'Time zone']],
    ];
    for (const [key, labels] of personalLabels) {
      const value = labeledValue(line, labels);
      if (value) personal[key] = value;
    }
    const linkLabels: Array<[keyof typeof links, string[]]> = [
      ['linkedin', ['LinkedIn', 'LinkedIn URL', 'LinkedIn profile']],
      ['github', ['GitHub', 'GitHub URL', 'GitHub profile']],
      ['portfolio', ['Portfolio', 'Portfolio URL']], ['website', ['Website', 'Personal website']],
      ['scholar', ['Google Scholar', 'Scholar', 'Scholar URL']],
    ];
    for (const [key, labels] of linkLabels) {
      const value = labeledValue(line, labels);
      if (value && key !== 'other') links[key] = value;
    }
    const location = labeledValue(line, ['Location', 'Current location']);
    if (location) {
      const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
      personal.city = parts[0];
      if (parts.length >= 2) personal.country = parts[parts.length - 1];
      if (parts.length >= 3) personal.region = parts.slice(1, -1).join(', ');
    }
    const school = labeledValue(line, ['Institution', 'University', 'School']);
    const degree = labeledValue(line, ['Degree']);
    if ((school && education.school && school !== education.school) ||
        (degree && education.degree && degree !== education.degree)) flushEducation();
    if (school) education.school = school;
    if (degree) education.degree = degree;
    const field = labeledValue(line, ['Field of study', 'Major']);
    const graduation = labeledValue(line, ['Expected graduation', 'Graduation', 'Graduation date']);
    if (field) education.fieldOfStudy = field;
    if (graduation) education.endDate = graduation;

    if (inSkills) {
      const bullet = line.match(/^[-*+]\s+([A-Za-z0-9#+.\s/()_-]+)$/);
      if (bullet && bullet[1].trim().length <= 30 && !skillsList.includes(bullet[1].trim())) skillsList.push(bullet[1].trim());
    }
  }
  flushEducation();
  if (Object.keys(personal).length) updates.personal = personal;
  if (Object.keys(links).length) updates.links = links;
  if (skillsList.length) updates.skills = skillsList;
  if (educationList.length) updates.education = educationList;
  return updates;
}
