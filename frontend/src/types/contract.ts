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
  detected_language?: string;
  document_title: string;
  parties_involved: string[];
  overall_risk_score: number;
  risk_summary: string;
  clauses: ClauseAnalysis[];
  action_checklist: string[];
  attorney_prep_questions: string[];
}

export interface NegotiationDraftRequest {
  clause_title: string;
  original_text: string;
  suggested_redline: string;
  counterparty_name?: string;
  user_role?: string;
}

export interface NegotiationDraftResponse {
  email_subject: string;
  email_diplomatic: string;
  email_firm: string;
  chat_diplomatic: string;
  chat_firm: string;
}

export type VerdictBadge = 'SAFE' | 'AT_RISK' | 'SEVERE_PENALTY' | 'UNADDRESSED';

export interface ScenarioRequest {
  scenario_query: string;
  contract_data: ContractAnalysisResult;
}

export interface ScenarioSimulationResponse {
  scenario_query: string;
  verdict_badge: VerdictBadge;
  direct_consequence: string;
  governing_clause_title: string;
  governing_clause_quote: string;
  recommended_action: string;
}

export interface DocxExportRequest {
  document_title: string;
  original_full_text?: string;
  clauses: ClauseAnalysis[];
}



