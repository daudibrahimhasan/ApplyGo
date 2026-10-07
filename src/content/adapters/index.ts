/**
 * Platform Adapters — Detection & Title Extraction Only
 *
 * These adapters identify which application platform a page belongs to
 * (Greenhouse, Lever, Workday, etc.) and extract the opportunity title
 * and organization name from platform-specific DOM selectors.
 *
 * IMPORTANT: Adapters do NOT implement:
 * - Platform-specific form scanning or custom control handling
 * - Step/page navigation for multi-step application flows
 * - Platform-specific filling strategies
 * - Tested end-to-end workflows on any specific platform
 *
 * All form scanning and filling is handled by the single generic engine
 * in scanner.ts and filler.ts, which works on standard HTML form controls.
 * Platform adapters only provide better opportunity metadata when a
 * recognized platform is detected.
 *
 * The `supportLevel` field on each adapter honestly documents this:
 * - 'detection-only': hostname matching + title extraction (current state)
 * - 'full': tested custom scanning, control handling, and filling (future)
 */

export type AdapterSupportLevel = 'detection-only' | 'full';

export interface PlatformAdapter {
  name: string;
  /** What this adapter actually implements. See module-level JSDoc. */
  supportLevel: AdapterSupportLevel;
  matches(url: string, doc: Document): boolean;
  extractOpportunity(doc: Document): {
    organization?: string;
    opportunityName?: string;
    opportunityType?: string;
  };
  customFieldSelector?: string;
}

// 1. Standard Adapter (generic fallback)
export const standardAdapter: PlatformAdapter = {
  name: 'standard',
  supportLevel: 'detection-only',
  matches: () => true,
  extractOpportunity: (doc) => {
    const title = doc.title || '';
    const h1 = doc.querySelector('h1')?.textContent?.trim() || '';
    return {
      opportunityName: h1 || title,
      opportunityType: 'General Application',
    };
  },
};

// 2. Google Forms
export const googleFormsAdapter: PlatformAdapter = {
  name: 'googleForms',
  supportLevel: 'detection-only',
  matches: (url) => url.includes('docs.google.com/forms'),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('.F9vfv, [role="heading"][aria-level="1"]')?.textContent?.trim() || doc.title;
    return {
      opportunityName: title.replace(/ - Google Forms/i, ''),
      opportunityType: 'Google Form',
    };
  },
};

// 3. Greenhouse (detection + title extraction only)
export const greenhouseAdapter: PlatformAdapter = {
  name: 'greenhouse',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('boards.greenhouse.io') ||
    url.includes('grnh.se') ||
    Boolean(doc.querySelector('#application_form, #grnhse_app')),
  extractOpportunity: (doc) => {
    const appTitle = doc.querySelector('.app-title')?.textContent?.trim();
    const companyName = doc.querySelector('.company-name')?.textContent?.trim();
    return {
      organization: companyName || '',
      opportunityName: appTitle || doc.title,
      opportunityType: 'Job Application',
    };
  },
};

// 4. Lever (detection + title extraction only)
export const leverAdapter: PlatformAdapter = {
  name: 'lever',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('jobs.lever.co') || Boolean(doc.querySelector('.application-form, .posting-headline')),
  extractOpportunity: (doc) => {
    const postingTitle = doc.querySelector('.posting-headline h2')?.textContent?.trim();
    const org = doc.querySelector('.main-header-logo img')?.getAttribute('alt') || '';
    return {
      organization: org,
      opportunityName: postingTitle || doc.title,
      opportunityType: 'Job Application',
    };
  },
};

// 5. Ashby (detection + title extraction only)
export const ashbyAdapter: PlatformAdapter = {
  name: 'ashby',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('jobs.ashbyhq.com') || Boolean(doc.querySelector('div[class*="ashby"]')),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('h1')?.textContent?.trim();
    return {
      opportunityName: title || doc.title,
      opportunityType: 'Job Application',
    };
  },
};

// 6. Workable (detection + title extraction only)
export const workableAdapter: PlatformAdapter = {
  name: 'workable',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('apply.workable.com') || Boolean(doc.querySelector('[data-ui="application-form"]')),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('h1[data-ui="job-title"]')?.textContent?.trim();
    const org = doc.querySelector('[data-ui="company-name"]')?.textContent?.trim();
    return {
      organization: org || '',
      opportunityName: title || doc.title,
      opportunityType: 'Job Application',
    };
  },
};

// 7. SmartRecruiters (detection + title extraction only)
export const smartRecruitersAdapter: PlatformAdapter = {
  name: 'smartRecruiters',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('smartrecruiters.com') || Boolean(doc.querySelector('oc-form, .st-apply')),
  extractOpportunity: (doc) => {
    const jobTitle = doc.querySelector('.job-title, h1')?.textContent?.trim();
    const company = doc.querySelector('.company-name')?.textContent?.trim();
    return {
      organization: company || '',
      opportunityName: jobTitle || doc.title,
      opportunityType: 'Job Application',
    };
  },
};

// 8. Fillout (detection + title extraction only)
export const filloutAdapter: PlatformAdapter = {
  name: 'fillout',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('fillout.com') || Boolean(doc.querySelector('[id*="fillout"]')),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('h1, h2')?.textContent?.trim();
    return {
      opportunityName: title || doc.title,
      opportunityType: 'Fillout Form',
    };
  },
};

// 9. Typeform (detection + title extraction only)
export const typeformAdapter: PlatformAdapter = {
  name: 'typeform',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('typeform.com') || Boolean(doc.querySelector('[data-qa*="typeform"]')),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('h1, [data-qa="block-title"]')?.textContent?.trim();
    return {
      opportunityName: title || doc.title,
      opportunityType: 'Typeform Form',
    };
  },
};

// 10. Workday (detection + title extraction only — best effort)
export const workdayAdapter: PlatformAdapter = {
  name: 'workday',
  supportLevel: 'detection-only',
  matches: (url, doc) =>
    url.includes('myworkdayjobs.com') ||
    url.includes('workday.com') ||
    Boolean(doc.querySelector('[data-automation-id="workdayApplication"]')),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('[data-automation-id="jobPostingHeader"], h2')?.textContent?.trim();
    return {
      opportunityName: title || doc.title,
      opportunityType: 'Workday Application',
    };
  },
};

export const ALL_ADAPTERS: PlatformAdapter[] = [
  googleFormsAdapter,
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  workableAdapter,
  smartRecruitersAdapter,
  filloutAdapter,
  typeformAdapter,
  workdayAdapter,
  standardAdapter, // fallback
];

export function findMatchingAdapter(url: string, doc: Document): PlatformAdapter {
  for (const adapter of ALL_ADAPTERS) {
    if (adapter !== standardAdapter && adapter.matches(url, doc)) {
      return adapter;
    }
  }
  return standardAdapter;
}
