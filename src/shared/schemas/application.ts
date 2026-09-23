import { z } from 'zod';

export const ApplicationHistorySchema = z.object({
  id: z.string(),
  organization: z.string(),
  opportunity: z.string(),
  opportunityType: z.string(),
  url: z.string(),
  dateOpened: z.string(),
  dateFilled: z.string().optional(),
  status: z.enum(['draft', 'applied', 'interviewing', 'rejected', 'accepted', 'closed']).default('draft'),
  resumeUsed: z.string().optional(),
  answersGenerated: z.number().default(0),
  answersInserted: z.number().default(0),
  notes: z.string().default(''),
});
export type ApplicationHistory = z.infer<typeof ApplicationHistorySchema>;
