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


def analyze_contract_text(
    text: str,
    api_key: Optional[str] = None,
    preferred_model: str = "gemini-3.6-flash"
) -> ContractAnalysisResult:
    """
    Analyzes a contract text string using Google GenAI SDK with structured Pydantic
    schema validation (ContractAnalysisResult) and deterministic temperature (0.1).
    Includes automatic fallback across available Flash models and transient error retries.
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

    candidate_models = [preferred_model]
    for model_name in ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"]:
        if model_name not in candidate_models:
            candidate_models.append(model_name)

    last_error = None

    for model_name in candidate_models:
        # Up to 2 attempts per model for transient errors
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=text,
                    config=config,
                )
                if not response.text:
                    raise RuntimeError(f"Empty response received from Gemini API using '{model_name}'.")

                return ContractAnalysisResult.model_validate_json(response.text)

            except APIError as err:
                last_error = err
                # If 404 (model unavailable) or 400 (bad request), skip to next candidate model
                if getattr(err, "code", None) in [400, 404]:
                    break
                # If 503/429 (temporary overload or rate limit), wait briefly and retry or try next model
                time.sleep(1.5 * (attempt + 1))
            except Exception as err:
                last_error = err
                break

    raise RuntimeError(f"All candidate Gemini models failed to analyze the contract. Last error: {last_error}")


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
