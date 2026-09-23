import { UserProfile } from '../schemas/profile';

/**
 * Empty default profile.
 *
 * GroundedApply ships with NO pre-filled personal data.
 * The user must populate their own profile through the extension UI
 * or by importing a backup. This prevents fabricated claims from
 * being deterministically autofilled into real applications.
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
    workAuthUS: false,
    requiresSponsorshipUS: true,
    workAuthUK: false,
    requiresSponsorshipUK: true,
    workAuthEU: false,
    requiresSponsorshipEU: true,
    otherCountries: [],
  },
  availability: {
    preferredLocations: [],
    remotePreference: 'any',
    fullTime: true,
  },
  preferences: {
    types: [],
    targetRoles: [],
    areasOfInterest: [],
  },
  resumes: [],
  updatedAt: new Date().toISOString(),
};
