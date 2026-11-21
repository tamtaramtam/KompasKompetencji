export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export type ProcessStatus =
  | 'NEW_INITIAL_TALK'
  | 'IN_PROGRESS'
  | 'AWAITING_REPORT'
  | 'READY_FOR_EVALUATION'
  | 'COMPLETED';

export type ScoreValue = 3 | 5 | 7;
export type ExamStatus = 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
export type FinalVerdict = 'POSITIVE' | 'NEGATIVE';

export interface EvaluationRecord {
  id: string;
  created_at: string;
  status: ProcessStatus;
  is_replacement: boolean;

  employee_data: {
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    startDate: string;
  };

  initial_talk_data?: {
    initialTalkDate: string;
    reportDeadlineFrom: string;
    reportDeadlineTo: string;
    evaluationPeriodFrom: string;
    evaluationPeriodTo: string;
  };

  employee_report?: {
    submittedAt: string;
    tasksPerformed: string;
    problemsAndSolutions: string;
    skillsAcquired: string;
    improvements: string;
  };

  exam_status?: ExamStatus;
  report_on_time?: boolean;

  scores?: {
    reliability: ScoreValue;
    knowledge: ScoreValue;
    organization: ScoreValue;
    communication: ScoreValue;
    cooperation: ScoreValue;
    average: number;
  };

  final_verdict?: FinalVerdict;
  justification?: string;
  development_conclusions?: string;
}