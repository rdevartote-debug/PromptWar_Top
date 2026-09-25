export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ClauseAnalysis {
  clause_id: string;
  clause_title: string;
  original_text: string;
  plain_english: string;
  risk_level: RiskLevel;
  risk_reasoning: string;
  suggested_redline: string;
  negotiation_tip: string;
}

export interface ContractAnalysisResult {
  document_title: string;
  parties_involved: string[];
  overall_risk_score: number;
  risk_summary: string;
  clauses: ClauseAnalysis[];
  action_checklist: string[];
  attorney_prep_questions: string[];
}
