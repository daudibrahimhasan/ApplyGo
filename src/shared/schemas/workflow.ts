export type AnalysisPhase = 'idle' | 'scanning' | 'analyzing' | 'ready' | 'partial' | 'error';

export interface PreparedFieldAnswer {
  fieldId: string;
  value: string;
  source: 'profile' | 'knowledge' | 'previous-answer' | 'ai';
  canFill: boolean;
  needsReview: boolean;
  error?: string;
}

export interface FormAnalysisState {
  phase: AnalysisPhase;
  completed: number;
  total: number;
  currentLabel?: string;
  answers: Record<string, PreparedFieldAnswer>;
  message?: string;
}

export const emptyFormAnalysis: FormAnalysisState = {
  phase: 'idle',
  completed: 0,
  total: 0,
  answers: {},
};
