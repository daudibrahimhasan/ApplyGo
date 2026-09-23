import { UserProfile } from '../schemas/profile';

export const defaultProfile: UserProfile = {
  id: 'profile_default_daud',
  personal: {
    firstName: 'Daud',
    lastName: 'Rahman',
    preferredName: 'Daud',
    pronouns: 'he/him',
    email: 'daud.rahman@example.com',
    phone: '+1 (555) 234-5678',
    city: 'San Francisco',
    region: 'CA',
    country: 'United States',
    timezone: 'America/Los_Angeles',
  },
  links: {
    linkedin: 'https://linkedin.com/in/daud-rahman',
    github: 'https://github.com/daud-rahman',
    portfolio: 'https://daudrahman.dev',
    scholar: 'https://scholar.google.com/citations?user=daud-rahman',
    website: 'https://daudrahman.dev',
    other: [],
  },
  education: [
    {
      id: 'edu_1',
      school: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science & Mathematics',
      gpa: '3.88',
      startDate: '2021-08',
      endDate: '2025-05',
      current: false,
      achievements: [
        'Dean\'s Honors List',
        'Course Staff for Machine Learning and CS Algorithms',
      ],
    },
  ],
  employment: [
    {
      id: 'emp_1',
      employer: 'Alignment & Verification Lab',
      role: 'Machine Learning Research Intern',
      city: 'Berkeley',
      country: 'United States',
      startDate: '2024-05',
      endDate: '2024-12',
      current: false,
      description:
        'Researched behavioral evaluations and containment monitoring for autonomous LLM agents in sandboxed environments.',
      highlights: [
        'Built reproducible evaluation harnesses for multi-turn tool-calling agents.',
        'Investigated causal interventions on internal activations for safety monitoring.',
      ],
    },
  ],
  research: [
    {
      id: 'res_1',
      institution: 'UC Berkeley CS Department',
      labOrGroup: 'Safety & Scalable Oversight Group',
      advisor: 'Prof. J. Doe',
      topic: 'Machine Unlearning & Evaluation of Autonomous Agent Behaviors',
      description:
        'Formulated negative controls and counterfactual testing suites to verify whether unlearning techniques truly remove targeted knowledge without damaging general model utility.',
      publications: [
        'Evaluating Machine Unlearning Under Counterfactual Probing (Preprint 2024)',
      ],
      startDate: '2023-09',
      endDate: '2025-05',
    },
  ],
  projects: [
    {
      id: 'proj_1',
      title: 'AgentContain',
      role: 'Lead Developer & Researcher',
      url: 'https://github.com/daud-rahman/agent-contain',
      description:
        'A sandboxed execution and behavioral telemetry engine for studying prompt injection resistance and containment in agentic workflows.',
      technologies: ['Python', 'PyTorch', 'Docker', 'FastAPI', 'TypeScript'],
      highlights: [
        'Implemented behavioral anomaly detectors across 1,000+ benchmarked agent runs.',
        'Published reproducible dataset of simulated privilege escalation attempts.',
      ],
    },
    {
      id: 'proj_2',
      title: 'EvalGround',
      role: 'Creator',
      url: 'https://github.com/daud-rahman/eval-ground',
      description:
        'Lightweight test harness for evaluating model consistency across counterfactual perturbation datasets.',
      technologies: ['Python', 'Hugging Face Transformers', 'SQLite'],
      highlights: [
        'Automated negative control checks for causal intervention experiments.',
      ],
    },
  ],
  skills: [
    'Python',
    'PyTorch',
    'TypeScript',
    'React',
    'Docker',
    'Linux',
    'Transformers',
    'Reinforcement Learning',
    'LLM Evaluation',
    'Mechanistic Interpretability',
    'Causal Inference',
    'Agentic Systems',
    'Git',
  ],
  awards: [
    {
      id: 'award_1',
      title: 'Undergraduate Research Fellowship in AI Safety',
      issuer: 'Berkeley Center for Human-Compatible AI (CHAI)',
      date: '2023-10',
      description: 'Awarded fellowship grant for work on autonomous agent safety protocols.',
    },
  ],
  leadership: [
    {
      id: 'lead_1',
      organization: 'AI Safety Student Initiative',
      role: 'Technical Discussion Lead',
      startDate: '2023-01',
      endDate: '2024-12',
      description: 'Organized reading groups and technical paper dissections on alignment and red-teaming.',
    },
  ],
  authorization: {
    workAuthUS: true,
    requiresSponsorshipUS: false,
    workAuthUK: false,
    requiresSponsorshipUK: true,
    workAuthEU: false,
    requiresSponsorshipEU: true,
    otherCountries: [],
  },
  availability: {
    earliestStartDate: '2025-06-01',
    noticePeriod: '2 weeks',
    preferredLocations: ['San Francisco, CA', 'Remote', 'London, UK', 'New York, NY'],
    remotePreference: 'any',
    fullTime: true,
  },
  preferences: {
    types: ['Research Fellowship', 'AI Safety Job', 'Research Program', 'Grant', 'Internship'],
    targetRoles: ['AI Safety Researcher', 'Research Engineer', 'Software Engineer (Alignment)', 'Fellow'],
    areasOfInterest: ['Agentic Safety & Containment', 'Evaluation & Red-Teaming', 'Machine Unlearning', 'Scalable Oversight'],
  },
  resumes: [
    {
      id: 'resume_default',
      name: 'Daud_Rahman_AI_Safety_Resume_2025.pdf',
      fileType: 'pdf',
      tags: ['AI Safety', 'Research', 'General'],
      isDefault: true,
      targetRoles: ['AI Safety Researcher', 'Research Engineer'],
      updatedAt: '2025-01-10T12:00:00.000Z',
    },
  ],
  updatedAt: new Date().toISOString(),
};
