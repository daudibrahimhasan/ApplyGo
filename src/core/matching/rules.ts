export interface FieldRule {
  profileKey: string;
  exactAutocompletes: string[];
  exactLabels: string[];
  regex: RegExp;
  inputTypeHint?: string[];
  weight: number;
  getter: (profile: any) => string | boolean | undefined;
}

export const FIELD_RULES: FieldRule[] = [
  // First Name
  {
    profileKey: 'personal.firstName',
    exactAutocompletes: ['given-name', 'fname', 'first-name'],
    exactLabels: ['first name', 'given name', 'forename', 'first', 'legal first name'],
    regex: /^(first(\s*name)?|given\s*name|forename)$/i,
    weight: 95,
    getter: (p) => p.personal?.firstName,
  },

  // Last Name
  {
    profileKey: 'personal.lastName',
    exactAutocompletes: ['family-name', 'lname', 'last-name'],
    exactLabels: ['last name', 'family name', 'surname', 'last', 'legal last name'],
    regex: /^(last(\s*name)?|family\s*name|surname)$/i,
    weight: 95,
    getter: (p) => p.personal?.lastName,
  },

  // Full Name
  {
    profileKey: 'personal.fullName',
    exactAutocompletes: ['name'],
    exactLabels: ['full name', 'name', 'legal name', 'your name', 'applicant name'],
    regex: /^(full\s*name|legal\s*name|your\s*name)$/i,
    weight: 85,
    getter: (p) => {
      const first = p.personal?.firstName || '';
      const last = p.personal?.lastName || '';
      return `${first} ${last}`.trim();
    },
  },

  // Email
  {
    profileKey: 'personal.email',
    exactAutocompletes: ['email'],
    exactLabels: ['email', 'email address', 'e-mail', 'e-mail address', 'primary email'],
    regex: /^e-?mail(\s*address)?$/i,
    inputTypeHint: ['email'],
    weight: 100,
    getter: (p) => p.personal?.email,
  },

  // Phone
  {
    profileKey: 'personal.phone',
    exactAutocompletes: ['tel', 'tel-national', 'phone'],
    exactLabels: ['phone', 'phone number', 'telephone', 'mobile phone', 'cell phone', 'contact number'],
    regex: /^(phone(\s*number)?|telephone|mobile(\s*phone)?|cell(\s*phone)?)$/i,
    inputTypeHint: ['tel'],
    weight: 95,
    getter: (p) => p.personal?.phone,
  },

  // City
  {
    profileKey: 'personal.city',
    exactAutocompletes: ['address-level2'],
    exactLabels: ['city', 'town', 'current city'],
    regex: /^city$/i,
    weight: 85,
    getter: (p) => p.personal?.city,
  },

  // State / Region
  {
    profileKey: 'personal.region',
    exactAutocompletes: ['address-level1'],
    exactLabels: ['state', 'province', 'region', 'state / province'],
    regex: /^(state|province|region)$/i,
    weight: 85,
    getter: (p) => p.personal?.region,
  },

  // Country
  {
    profileKey: 'personal.country',
    exactAutocompletes: ['country', 'country-name'],
    exactLabels: ['country', 'country / region', 'location (country)'],
    regex: /^country(\s*\/\s*region)?$/i,
    weight: 85,
    getter: (p) => p.personal?.country,
  },

  // Pronouns
  {
    profileKey: 'personal.pronouns',
    exactAutocompletes: [],
    exactLabels: ['pronouns', 'preferred pronouns', 'your pronouns'],
    regex: /^pronouns?$/i,
    weight: 85,
    getter: (p) => p.personal?.pronouns,
  },

  // LinkedIn
  {
    profileKey: 'links.linkedin',
    exactAutocompletes: [],
    exactLabels: ['linkedin', 'linkedin profile', 'linkedin url'],
    regex: /linkedin(\s*(profile|url))?/i,
    inputTypeHint: ['url', 'text'],
    weight: 95,
    getter: (p) => p.links?.linkedin,
  },

  // GitHub
  {
    profileKey: 'links.github',
    exactAutocompletes: [],
    exactLabels: ['github', 'github profile', 'github url', 'github username'],
    regex: /github(\s*(profile|url|username))?/i,
    inputTypeHint: ['url', 'text'],
    weight: 95,
    getter: (p) => p.links?.github,
  },

  // Portfolio / Website
  {
    profileKey: 'links.website',
    exactAutocompletes: ['url'],
    exactLabels: ['website', 'personal website', 'portfolio', 'portfolio url', 'personal site'],
    regex: /^(website|portfolio|personal\s*website|personal\s*site)(\s*url)?$/i,
    inputTypeHint: ['url', 'text'],
    weight: 90,
    getter: (p) => p.links?.portfolio || p.links?.website,
  },

  // Google Scholar
  {
    profileKey: 'links.scholar',
    exactAutocompletes: [],
    exactLabels: ['scholar', 'google scholar', 'google scholar url', 'publications link'],
    regex: /google\s*scholar/i,
    inputTypeHint: ['url', 'text'],
    weight: 95,
    getter: (p) => p.links?.scholar,
  },

  // School / University
  {
    profileKey: 'education.school',
    exactAutocompletes: [],
    exactLabels: ['school', 'university', 'college', 'institution', 'school / university'],
    regex: /^(school|university|college|institution)(\s*name)?$/i,
    weight: 80,
    getter: (p) => p.education?.[0]?.school,
  },

  // Degree
  {
    profileKey: 'education.degree',
    exactAutocompletes: [],
    exactLabels: ['degree', 'degree level', 'highest degree attained', 'education degree'],
    regex: /^degree(\s*level)?$/i,
    weight: 80,
    getter: (p) => p.education?.[0]?.degree,
  },

  // Field of Study / Major
  {
    profileKey: 'education.fieldOfStudy',
    exactAutocompletes: [],
    exactLabels: ['discipline', 'field of study', 'major', 'program of study'],
    regex: /^(discipline|field\s*of\s*study|major)$/i,
    weight: 80,
    getter: (p) => p.education?.[0]?.fieldOfStudy,
  },

  // GPA
  {
    profileKey: 'education.gpa',
    exactAutocompletes: [],
    exactLabels: ['gpa', 'cumulative gpa', 'grade point average'],
    regex: /^(cumulative\s*)?gpa$/i,
    weight: 90,
    getter: (p) => p.education?.[0]?.gpa,
  },

  // Work Authorization US
  {
    profileKey: 'authorization.workAuthUS',
    exactAutocompletes: [],
    exactLabels: [
      'are you legally authorized to work in the united states',
      'authorized to work in the us',
      'are you authorized to work in the us',
      'work authorization us',
    ],
    regex: /authorized\s*to\s*work\s*(in\s*the)?\s*(us|united\s*states)/i,
    weight: 85,
    getter: (p) => p.authorization?.workAuthUS ? 'Yes' : 'No',
  },

  // Requires Sponsorship US
  {
    profileKey: 'authorization.requiresSponsorshipUS',
    exactAutocompletes: [],
    exactLabels: [
      'will you now or in the future require sponsorship for employment visa status',
      'do you require visa sponsorship',
      'require sponsorship',
    ],
    regex: /require(\s*visa)?\s*sponsorship/i,
    weight: 85,
    getter: (p) => p.authorization?.requiresSponsorshipUS ? 'Yes' : 'No',
  },

  // Availability / Start Date
  {
    profileKey: 'availability.earliestStartDate',
    exactAutocompletes: [],
    exactLabels: ['start date', 'earliest start date', 'available start date'],
    regex: /^(earliest\s*)?start\s*date$/i,
    weight: 80,
    getter: (p) => p.availability?.earliestStartDate,
  },
];
