import os
import time
import json
from typing import List, Literal, Optional
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from google.genai.errors import APIError

# Load environment variables from .env files
load_dotenv()
load_dotenv(Path(__file__).parent.parent / ".env")
load_dotenv(Path(__file__).parent / ".env")


# ==============================================================================
# Pydantic Data Contract (ContractAnalysisResult)
# ==============================================================================

class ClauseAnalysis(BaseModel):
    clause_id: str = Field(
        description="Unique identifier for the clause (e.g., 'sec_ip_assignment', 'sec_termination')"
    )
    clause_title: str = Field(
        description="Descriptive title of the clause"
    )
    original_text: str = Field(
        description="The exact or representative original clause text from the contract"
    )
    plain_english: str = Field(
        description="Simplified explanation of what this clause means at an 8th-grade reading level"
    )
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(
        description="Risk assessment level for this clause"
    )
    risk_reasoning: str = Field(
        description="Detailed explanation of why this clause poses a risk or is standard/favorable"
    )
    suggested_redline: str = Field(
        description="A balanced, fair counter-proposal or replacement wording to protect the user"
    )
    negotiation_tip: str = Field(
        description="Actionable advice and talking points on how to negotiate this clause with the counterparty"
    )


class ContractAnalysisResult(BaseModel):
    document_title: str = Field(
        description="Title or inferred type of the agreement"
    )
    parties_involved: List[str] = Field(
        description="Names or roles of all parties identified in the contract"
    )
    overall_risk_score: int = Field(
        ge=0,
        le=100,
        description="Overall risk score from 0 (very safe) to 100 (extremely high risk/predatory)"
    )
    risk_summary: str = Field(
        description="Executive summary of the primary contract risks in 2-3 concise sentences"
    )
    clauses: List[ClauseAnalysis] = Field(
        description="Detailed breakdown and risk analysis of all evaluated clauses"
    )
    action_checklist: List[str] = Field(
        description="Concrete, prioritized action checklist the user should complete before signing"
    )
    attorney_prep_questions: List[str] = Field(
        description="Specific, strategic questions to ask legal counsel regarding high-risk terms"
    )


# ==============================================================================
# System Instructions & Inference Function
# ==============================================================================

SYSTEM_INSTRUCTION = (
    "You are an objective legal translator and risk analyzer. Your role is to analyze legal contracts, "
    "translate complex legalese into clear plain English (aimed at an 8th-grade reading level), detect unfair, "
    "one-sided, or overly restrictive terms, and generate balanced, practical redline counter-proposals.\n\n"
    "Explicit Disclaimer: Your analysis is provided strictly for informational and educational guidance "
    "and does not constitute formal legal advice or create an attorney-client relationship."
)


CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
]


def analyze_contract_text(
    text: str,
    api_key: Optional[str] = None,
    preferred_model: str = "gemini-3.5-flash-lite"
) -> ContractAnalysisResult:
    """
    Analyzes a contract text string using Google GenAI SDK with structured Pydantic
    schema validation (ContractAnalysisResult) and deterministic temperature (0.1).
    Instant failover across available Flash models without blocking delays.
    """
    resolved_api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not resolved_api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Please set the GEMINI_API_KEY environment variable "
            "or provide a .env file."
        )

    client = genai.Client(api_key=resolved_api_key)

    config = types.GenerateContentConfig(
        temperature=0.1,
        response_mime_type="application/json",
        response_schema=ContractAnalysisResult,
        system_instruction=SYSTEM_INSTRUCTION,
    )

    candidate_models = list(CANDIDATE_MODELS)
    if preferred_model and preferred_model not in candidate_models:
        candidate_models.insert(0, preferred_model)
    elif preferred_model and preferred_model != candidate_models[0]:
        candidate_models.remove(preferred_model)
        candidate_models.insert(0, preferred_model)

    last_error = None

    for model_name in candidate_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=text,
                config=config,
            )
            if response and response.text:
                return ContractAnalysisResult.model_validate_json(response.text)
            else:
                last_error = RuntimeError(f"Empty response received from '{model_name}'.")
        except Exception as err:
            last_error = err
            # Immediately try next candidate model without blocking sleep
            continue

    raise RuntimeError(f"All candidate Gemini models failed to analyze the contract. Last error: {last_error}")


# ==============================================================================
# Negotiation Email & Chat Response Generator
# ==============================================================================

class NegotiationDraftRequest(BaseModel):
    clause_title: str = Field(description="Title of the clause to negotiate")
    original_text: str = Field(description="Original contract clause text")
    suggested_redline: str = Field(description="Balanced counter-proposal redline text")
    counterparty_name: Optional[str] = Field(default="Client / Landlord", description="Name of the counterparty who provided the contract")
    user_role: Optional[str] = Field(default="Contractor / Tenant", description="Role of the user reviewing the contract")


class NegotiationDraftResponse(BaseModel):
    email_subject: str = Field(description="Professional email subject line")
    email_diplomatic: str = Field(description="Polite, collaborative negotiation email proposing the redline")
    email_firm: str = Field(description="Assertive, principled negotiation email proposing the redline")
    chat_diplomatic: str = Field(description="Concise, polite message formatted for WhatsApp or Slack")
    chat_firm: str = Field(description="Concise, direct message formatted for WhatsApp or Slack")


NEGOTIATION_SYSTEM_INSTRUCTION = (
    "You are an expert contract negotiation advisor. The user is currently negotiating a contract clause "
    "with a counterparty. Your task is to draft professional, ready-to-send negotiation responses proposing "
    "a balanced counter-proposal redline.\n\n"
    "Crucial Guidelines:\n"
    "1. The message is sent BY the user (Sender) TO the counterparty (Recipient).\n"
    "2. email_subject: A concise, professional email subject line referencing the agreement and clause.\n"
    "3. email_diplomatic: Polite, collaborative, partnership-oriented tone. Acknowledges the overall agreement, "
    "kindly explains the specific issue with the original clause, proposes the exact redline wording, and expresses enthusiasm for working together.\n"
    "4. email_firm: Assertive, principled, and clear. States that the clause presents an unacceptable legal or commercial risk, "
    "clearly proposes the redline wording, and explains that agreement on this point is required before signing.\n"
    "5. chat_diplomatic: Optimized for WhatsApp, Slack, or SMS. Short, friendly, polite, quoting the proposed edit.\n"
    "6. chat_firm: Optimized for WhatsApp, Slack, or SMS. Direct, professional, concise, clearly requesting the adjustment."
)


def generate_negotiation_draft(
    req: NegotiationDraftRequest,
    api_key: Optional[str] = None,
    preferred_model: str = "gemini-3.5-flash-lite",
) -> NegotiationDraftResponse:
    """
    Generates tailored email and WhatsApp/Slack negotiation drafts in both
    'Diplomatic' and 'Firm' tones using Google GenAI SDK.
    """
    resolved_api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not resolved_api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Please set the GEMINI_API_KEY environment variable "
            "or provide a .env file."
        )

    client = genai.Client(api_key=resolved_api_key)

    config = types.GenerateContentConfig(
        temperature=0.2,
        response_mime_type="application/json",
        response_schema=NegotiationDraftResponse,
        system_instruction=NEGOTIATION_SYSTEM_INSTRUCTION,
    )

    candidate_models = list(CANDIDATE_MODELS)
    if preferred_model and preferred_model not in candidate_models:
        candidate_models.insert(0, preferred_model)
    elif preferred_model and preferred_model != candidate_models[0]:
        candidate_models.remove(preferred_model)
        candidate_models.insert(0, preferred_model)

    prompt = (
        f"Clause Title: {req.clause_title}\n"
        f"Original Clause Text: \"{req.original_text}\"\n"
        f"Proposed Balanced Redline: \"{req.suggested_redline}\"\n"
        f"Recipient / Counterparty: {req.counterparty_name or 'Client / Landlord'}\n"
        f"Sender / User Role: {req.user_role or 'Contractor / Tenant'}\n\n"
        "Generate the email_subject, email_diplomatic, email_firm, chat_diplomatic, and chat_firm drafts."
    )

    last_error = None
    for model_name in candidate_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            if response and response.text:
                return NegotiationDraftResponse.model_validate_json(response.text)
            else:
                last_error = RuntimeError(f"Empty response received from '{model_name}'.")
        except Exception as err:
            last_error = err
            continue

    raise RuntimeError(f"Failed to generate negotiation draft. Last error: {last_error}")


# ==============================================================================
# Self-Contained Test Harness
# ==============================================================================

SAMPLE_CONTRACT = """
INDEPENDENT CONTRACTOR SERVICES AGREEMENT

This Independent Contractor Services Agreement ("Agreement") is entered into by and between 
Apex Global Enterprises LLC ("Company") and Jane Doe ("Contractor").

SECTION 1. SERVICES AND COMPENSATION
Contractor agrees to perform software development services as assigned by Company. 
Compensation shall be paid monthly upon Company's sole discretion and satisfaction with deliverables.

SECTION 2. TERMINATION AND PAYMENT FORFEITURE (Immediate Zero-Notice Termination)
Company reserves the absolute right to terminate this Agreement immediately at any time, with or 
without cause, and without prior notice. In the event of termination for any reason, Contractor 
shall immediately forfeit all unpaid fees and accrued compensation for all work performed up to 
the date of termination. Contractor shall have no right to seek remedy or outstanding payment.

SECTION 3. INTELLECTUAL PROPERTY ASSIGNMENT (Comprehensive Off-Hours IP Assignment)
Contractor hereby irrevocably assigns, transfers, and conveys to Company all right, title, and interest 
in and to any and all inventions, works of authorship, software, designs, ideas, trade secrets, and 
intellectual property created, conceived, developed, or reduced to practice by Contractor, whether alone 
or with others, during the term of this Agreement, regardless of whether created during working hours, 
using Company equipment, or during Contractor's personal off-hours at home entirely unrelated to Company's business.

SECTION 4. INDEMNIFICATION AND LIABILITY (Uncapped One-Sided Indemnity)
Contractor agrees to indemnify, defend, and hold harmless Company, its officers, directors, employees, 
and affiliates from and against any and all claims, damages, liabilities, losses, judgments, costs, 
and expenses (including unlimited attorney's fees) arising out of or related to this Agreement or 
Contractor's services, regardless of Company's negligence. Company shall bear zero liability to 
Contractor under any legal theory, and Contractor's liability shall be completely uncapped.
"""

if __name__ == "__main__":
    print("=" * 75)
    print("Legal Doc AI - Phase 1: Contract Analysis Pipeline Execution")
    print("=" * 75)

    try:
        print("\n[1/3] Running deterministic contract analysis with Google GenAI SDK...")
        result = analyze_contract_text(SAMPLE_CONTRACT)

        print("\n[2/3] Verification & Metrics Summary:")
        print(f"  • Document Title      : {result.document_title}")
        print(f"  • Parties Involved    : {', '.join(result.parties_involved)}")
        print(f"  • Overall Risk Score  : {result.overall_risk_score}/100")
        print(f"  • Executive Summary   : {result.risk_summary}")
        print(f"\n  • Evaluated Clauses ({len(result.clauses)} total):")
        for idx, clause in enumerate(result.clauses, start=1):
            print(f"    [{idx}] {clause.clause_title} (ID: {clause.clause_id})")
            print(f"        Risk Level : {clause.risk_level}")
            print(f"        Plain Text : {clause.plain_english}")
            print(f"        Reasoning  : {clause.risk_reasoning}")
            print(f"        Redline    : {clause.suggested_redline}")
            print(f"        Tip        : {clause.negotiation_tip}")

        print("\n  • Action Checklist:")
        for item in result.action_checklist:
            print(f"    [ ] {item}")

        print("\n  • Attorney Preparation Questions:")
        for q in result.attorney_prep_questions:
            print(f"    (?) {q}")

        # Export result to mockData.json in root/working directory
        output_path = Path("mockData.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result.model_dump(), f, indent=2, ensure_ascii=False)

        print(f"\n[3/3] Success! Validated structured JSON dumped to: {output_path.resolve()}")
        print("=" * 75)

    except Exception as err:
        print(f"\n[ERROR] Execution failed: {err}")
        raise
