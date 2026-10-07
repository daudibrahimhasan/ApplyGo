import { UserProfile } from '../schemas/profile';

/**
 * Empty default profile.
 *
 * ApplyGo ships with NO pre-filled personal data.
 * The user must populate their own profile through the extension UI
 * or by importing a backup. This prevents fabricated claims from
 * being deterministically autofilled into real applications.
 *
 * Authorization and availability fields are null (unanswered) until
 * the user explicitly provides them. The deterministic engine treats
 * null values as "not yet answered" and will not fill them.
 */
export const defaultProfile: UserProfile = {
  id: 'profile_default',
  personal: {
    firstName: '',
    lastName: '',
    preferredName: undefined,
    pronouns: undefined,
    email: '',
    alternateEmail: undefined,
    phone: undefined,
    city: undefined,
    region: undefined,
    country: undefined,
    timezone: undefined,
  },
  links: {
    linkedin: undefined,
    github: undefined,
    portfolio: undefined,
    scholar: undefined,
    website: undefined,
    other: [],
  },
  education: [],
  employment: [],
  research: [],
  projects: [],
  skills: [],
  awards: [],
  leadership: [],
  authorization: {
    workAuthUS: null,
    requiresSponsorshipUS: null,
    workAuthUK: null,
    requiresSponsorshipUK: null,
    workAuthEU: null,
    requiresSponsorshipEU: null,
    otherCountries: [],
  },
  availability: {
    preferredLocations: [],
    remotePreference: null,
    fullTime: null,
  },
  preferences: {
    types: [],
    targetRoles: [],
    areasOfInterest: [],
  },
  resumes: [],
  updatedAt: new Date().toISOString(),
};
