import { z } from 'zod';

export const EducationRecordSchema = z.object({
  id: z.string(),
  school: z.string().min(1, 'School is required'),
  degree: z.string().min(1, 'Degree is required'),
  fieldOfStudy: z.string().default(''),
  gpa: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  achievements: z.array(z.string()).default([]),
});
export type EducationRecord = z.infer<typeof EducationRecordSchema>;

export const EmploymentRecordSchema = z.object({
  id: z.string(),
  employer: z.string().min(1, 'Employer is required'),
  role: z.string().min(1, 'Role is required'),
  city: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string().default(''),
  highlights: z.array(z.string()).default([]),
});
export type EmploymentRecord = z.infer<typeof EmploymentRecordSchema>;

export const ResearchRecordSchema = z.object({
  id: z.string(),
  institution: z.string().min(1, 'Institution is required'),
  labOrGroup: z.string().optional(),
  advisor: z.string().optional(),
  topic: z.string().min(1, 'Topic is required'),
  description: z.string().default(''),
  publications: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type ResearchRecord = z.infer<typeof ResearchRecordSchema>;

export const ProjectRecordSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  role: z.string().optional(),
  url: z.string().optional(),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
});
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;

export const AwardRecordSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().optional(),
  description: z.string().optional(),
});
export type AwardRecord = z.infer<typeof AwardRecordSchema>;

export const LeadershipRecordSchema = z.object({
  id: z.string(),
  organization: z.string().min(1, 'Organization is required'),
  role: z.string().min(1, 'Role is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});
export type LeadershipRecord = z.infer<typeof LeadershipRecordSchema>;

export const AuthorizationProfileSchema = z.object({
  workAuthUS: z.boolean().nullable().default(null),
  requiresSponsorshipUS: z.boolean().nullable().default(null),
  workAuthUK: z.boolean().nullable().default(null),
  requiresSponsorshipUK: z.boolean().nullable().default(null),
  workAuthEU: z.boolean().nullable().default(null),
  requiresSponsorshipEU: z.boolean().nullable().default(null),
  otherCountries: z
    .array(
      z.object({
        country: z.string(),
        authorized: z.boolean(),
        requiresSponsorship: z.boolean(),
      })
    )
    .default([]),
});
export type AuthorizationProfile = z.infer<typeof AuthorizationProfileSchema>;

export const AvailabilityProfileSchema = z.object({
  earliestStartDate: z.string().optional(),
  noticePeriod: z.string().optional(),
  preferredLocations: z.array(z.string()).default([]),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']).nullable().default(null),
  fullTime: z.boolean().nullable().default(null),
});
export type AvailabilityProfile = z.infer<typeof AvailabilityProfileSchema>;

export const OpportunityPreferencesSchema = z.object({
  types: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
  areasOfInterest: z.array(z.string()).default([]),
});
export type OpportunityPreferences = z.infer<typeof OpportunityPreferencesSchema>;

export const ResumeRecordSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Resume name is required'),
  fileType: z.enum(['pdf', 'docx']),
  dataUrl: z.string().optional(),
  textContent: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
  updatedAt: z.string(),
});
export type ResumeRecord = z.infer<typeof ResumeRecordSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  personal: z.object({
    firstName: z.string().default(''),
    middleName: z.string().optional(),
    lastName: z.string().default(''),
    preferredName: z.string().optional(),
    pronouns: z.string().optional(),
    email: z.string().default(''),
    alternateEmail: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().optional(),
  }),
  links: z.object({
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
    scholar: z.string().optional(),
    website: z.string().optional(),
    other: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
        })
      )
      .default([]),
  }),
  education: z.array(EducationRecordSchema).default([]),
  employment: z.array(EmploymentRecordSchema).default([]),
  research: z.array(ResearchRecordSchema).default([]),
  projects: z.array(ProjectRecordSchema).default([]),
  skills: z.array(z.string()).default([]),
  awards: z.array(AwardRecordSchema).default([]),
  leadership: z.array(LeadershipRecordSchema).default([]),
  authorization: AuthorizationProfileSchema.default({
    workAuthUS: null,
    requiresSponsorshipUS: null,
    workAuthUK: null,
    requiresSponsorshipUK: null,
    workAuthEU: null,
    requiresSponsorshipEU: null,
    otherCountries: [],
  }),
  availability: AvailabilityProfileSchema.default({
    preferredLocations: [],
    remotePreference: null,
    fullTime: null,
  }),
  preferences: OpportunityPreferencesSchema.default({
    types: [],
    targetRoles: [],
    areasOfInterest: [],
  }),
  resumes: z.array(ResumeRecordSchema).default([]),
  updatedAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export type ProfilePartialUpdate = {
  personal?: Partial<UserProfile['personal']>;
  education?: EducationRecord[];
  skills?: string[];
  links?: Partial<UserProfile['links']>;
  authorization?: Partial<UserProfile['authorization']>;
  availability?: Partial<UserProfile['availability']>;
};
