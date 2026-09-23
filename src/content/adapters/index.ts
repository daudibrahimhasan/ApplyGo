export interface PlatformAdapter {
  name: string;
  matches(url: string, doc: Document): boolean;
  extractOpportunity(doc: Document): {
    organization?: string;
    opportunityName?: string;
    opportunityType?: string;
  };
  customFieldSelector?: string;
}

// 1. Standard Adapter
export const standardAdapter: PlatformAdapter = {
  name: 'standard',
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
  matches: (url) => url.includes('docs.google.com/forms'),
  extractOpportunity: (doc) => {
    const title = doc.querySelector('.F9vfv, [role="heading"][aria-level="1"]')?.textContent?.trim() || doc.title;
    return {
      opportunityName: title.replace(/ - Google Forms/i, ''),
      opportunityType: 'Google Form',
    };
  },
};

// 3. Greenhouse
export const greenhouseAdapter: PlatformAdapter = {
  name: 'greenhouse',
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

// 4. Lever
export const leverAdapter: PlatformAdapter = {
  name: 'lever',
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

// 5. Ashby
export const ashbyAdapter: PlatformAdapter = {
  name: 'ashby',
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

// 6. Workable
export const workableAdapter: PlatformAdapter = {
  name: 'workable',
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

// 7. SmartRecruiters
export const smartRecruitersAdapter: PlatformAdapter = {
  name: 'smartRecruiters',
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

// 8. Fillout
export const filloutAdapter: PlatformAdapter = {
  name: 'fillout',
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

// 9. Typeform
export const typeformAdapter: PlatformAdapter = {
  name: 'typeform',
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

// 10. Workday (Best Effort)
export const workdayAdapter: PlatformAdapter = {
  name: 'workday',
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
