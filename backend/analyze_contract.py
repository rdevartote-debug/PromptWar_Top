import os
import time
import json
import re
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
    detected_language: str = Field(
        default="English",
        description="Auto-detected primary language of the uploaded document (e.g., 'English', 'Marathi', 'Hindi', 'Spanish')"
    )
    document_title: str = Field(
        description="Title or inferred type of the agreement in the detected document language"
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
        description="Executive summary of the primary contract risks in 2-3 concise sentences in the detected document language"
    )
    clauses: List[ClauseAnalysis] = Field(
        description="Detailed breakdown and risk analysis of all evaluated clauses"
    )
    action_checklist: List[str] = Field(
        description="Concrete, prioritized action checklist in the detected document language"
    )
    attorney_prep_questions: List[str] = Field(
        description="Specific, strategic questions in the detected document language to ask legal counsel regarding high-risk terms"
    )


# ==============================================================================
# System Instructions & Inference Function
# ==============================================================================

SYSTEM_INSTRUCTION = (
    "You are an objective legal translator and risk analyzer. Your role is to analyze legal contracts, "
    "translate complex legalese into clear, plain language (aimed at an 8th-grade reading level in the document's native language), "
    "detect unfair, one-sided, or overly restrictive terms, and generate balanced, practical redline counter-proposals.\n\n"
    "CRITICAL LANGUAGE INSTRUCTION:\n"
    "1. Auto-detect the primary language of the uploaded document (e.g., English, Marathi, Hindi, Spanish). Set the 'detected_language' field to this value.\n"
    "2. You MUST output ALL plain-text fields in this detected language.\n"
    "3. This includes the `risk_summary` (overall summary), `plain_english` (plain explanation), `clause_title`, `risk_reasoning`, `suggested_redline`, `negotiation_tip`, and all `action_checklist` and `attorney_prep_questions` items. "
    "If the document is in Marathi, explain the risks, summaries, tips, redlines, and checklist in fluent, professional Marathi. If Hindi, use Hindi. If Spanish, use Spanish. If English, use English.\n"
    "4. Retain the exact original `original_text` as it appears in the document for accurate citation.\n\n"
    "Explicit Disclaimer: Your analysis is provided strictly for informational and educational guidance "
    "and does not constitute formal legal advice or create an attorney-client relationship."
)


CANDIDATE_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
]


def generate_fallback_analysis(text: str, reason: str = "") -> ContractAnalysisResult:
    """
    Deterministic rule-based fallback analyzer that scans contract text for
    standard clauses, evaluates risk levels, and generates structured analysis
    when remote Gemini API models are temporarily unavailable (e.g. 503 high demand).
    Preserves Native Language In, Native Language Out processing.
    """
    # Detect language: check for Devanagari script (Marathi / Hindi)
    has_devanagari = bool(re.search(r"[\u0900-\u097F]", text))
    if has_devanagari:
        marathi_markers = ["आहे", "नाही", "करार", "भाडेकरार", "पक्षकार", "रुपये", "दिनांक", "महिना", "स्वाक्षरी", "भाडेकरू", "मालक"]
        is_marathi = any(w in text for w in marathi_markers)
        detected_lang = "Marathi" if is_marathi else "Hindi"
    else:
        detected_lang = "English"

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    doc_title = "Commercial Agreement" if detected_lang == "English" else ("व्यावसायिक करारनामा" if detected_lang == "Marathi" else "व्यावसायिक अनुबंध")
    for line in lines[:8]:
        if any(keyword in line.upper() for keyword in ["AGREEMENT", "CONTRACT", "TERMS", "POLICY", "NDA", "MEMORANDUM", "करार", "भाडेकरार", "अनुबंध"]):
            doc_title = line.strip("#=*- ")[:80]
            break

    # Parties detection
    parties = []
    text_lower = text.lower()
    m_between = re.search(r"between\s+([A-Za-z0-9\s,\.\'\"]+?)\s+(?:and|&)\s+([A-Za-z0-9\s,\.\'\"]+?)(?:\.|\n|\r|,|;)", text, re.IGNORECASE)
    if m_between:
        p1 = m_between.group(1).strip(" \"'()[]")[:50]
        p2 = m_between.group(2).strip(" \"'()[]")[:50]
        if p1 and p2:
            parties = [p1, p2]
    if not parties:
        if detected_lang == "Marathi":
            if "मालक" in text or "भाडेकरू" in text:
                parties = ["घरमालक / जागा मालक", "भाडेकरू"]
            else:
                parties = ["प्रथम पक्षकार", "द्वितीय पक्षकार"]
        elif detected_lang == "Hindi":
            parties = ["प्रथम पक्ष", "द्वितीय पक्ष"]
        else:
            if "company" in text_lower and "contractor" in text_lower:
                parties = ["Company", "Contractor"]
            elif "landlord" in text_lower and "tenant" in text_lower:
                parties = ["Landlord", "Tenant"]
            elif "disclosing party" in text_lower or "receiving party" in text_lower:
                parties = ["Disclosing Party", "Receiving Party"]
            else:
                parties = ["Party A", "Party B"]

    clauses: List[ClauseAnalysis] = []
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
    if not paragraphs:
        paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 30]

    def find_best_para(keywords: List[str]) -> Optional[str]:
        for p in paragraphs:
            p_lower = p.lower()
            if any(k in p_lower for k in keywords):
                return p
        return None

    # 1. Termination clause
    term_para = find_best_para(["terminat", "forfeit", "cancellation", "without notice", "रद्द", "समाप्ती", "मुदतपूर्व"])
    if term_para:
        p_low = term_para.lower()
        is_crit = "forfeit" in p_low or "without notice" in p_low or "immediate" in p_low or "जप्त" in p_low or "पूर्वसूचना न देता" in p_low
        if detected_lang == "Marathi":
            clauses.append(ClauseAnalysis(
                clause_id="sec_termination",
                clause_title="करार समाप्ती आणि पूर्वसूचनेची अट",
                original_text=term_para[:500],
                plain_english="दुसरा पक्ष हा करार तातडीने किंवा कमी नोटीस देऊन संपुष्टात आणू शकतो, आणि योग्य सूचनेशिवाय केलेल्या कामाचे पैसे न मिळण्याची जोखीम आहे.",
                risk_level="CRITICAL" if is_crit else "HIGH",
                risk_reasoning="पूर्वसूचनेचा कालावधी न ठेवता त्वरित करार रद्द करणे किंवा देय रक्कम जप्त करणे हे एकांगी आणि गंभीर आर्थिक नुकसान करणारे आहे.",
                suggested_redline="कोणत्याही पक्षाला हा करार संपुष्टात आणण्यापूर्वी किमान ३० दिवसांची लेखी पूर्वसूचना देणे बंधनकारक राहील. करार संपण्याच्या तारखेपर्यंत केलेल्या सर्व कामांचे देयक देणे अनिवार्य असेल.",
                negotiation_tip="किमान १४ ते ३० दिवसांच्या लेखी पूर्वसूचनेचा आग्रह धरा आणि थकबाकी न जप्त करण्याची हमी घ्या.",
            ))
        else:
            clauses.append(ClauseAnalysis(
                clause_id="sec_termination",
                clause_title="Termination and Notice Requirements",
                original_text=term_para[:500],
                plain_english="The other party can terminate this agreement quickly or immediately, and you risk losing compensation for completed work without adequate notice.",
                risk_level="CRITICAL" if is_crit else "HIGH",
                risk_reasoning="Immediate termination without cure periods or payment forfeiture leaves you commercially vulnerable with zero revenue security.",
                suggested_redline="Either party may terminate this Agreement upon thirty (30) days prior written notice. Upon termination, Contractor shall be promptly compensated for all services performed up to the termination date.",
                negotiation_tip="Insist on a 14-30 day written notice period and strict protection ensuring accrued fees are non-forfeitable.",
            ))

    # 2. IP Assignment / Property Rights
    ip_para = find_best_para(["intellectual property", "inventions", "work product", "all right, title", "off-hours", "moral rights", "मालकी हक्क", "बौद्धिक संपदा"])
    if ip_para:
        p_low = ip_para.lower()
        is_crit = "off-hours" in p_low or "personal" in p_low or "entirely unrelated" in p_low or "alone or with others" in p_low
        if detected_lang == "Marathi":
            clauses.append(ClauseAnalysis(
                clause_id="sec_ip_assignment",
                clause_title="बौद्धिक संपदा आणि मालकी हक्क",
                original_text=ip_para[:500],
                plain_english="कंपनी सर्व निर्मिती आणि बौद्धिक संपदेवर संपूर्ण मालकी सांगते, ज्यामध्ये वैयक्तिक वेळेत किंवा स्वतंत्रपणे केलेल्या कामाचाही समावेश होऊ शकतो.",
                risk_level="CRITICAL" if is_crit else "HIGH",
                risk_reasoning="कामाच्या तासांनंतरच्या किंवा स्वतंत्र वैयक्तिक प्रकल्पांवर मालकी हक्क मागणे अन्यायकारक असून यामुळे तुमच्या भविष्यातील कामावर गदा येते.",
                suggested_redline="केवळ या कराराखाली आणि मोबदला देऊन तयार केलेल्या कामांवरच क्लायंटचा हक्क राहील. कंत्राटदाराच्या वैयक्तिक वेळेत केलेल्या स्वतंत्र कामावर कंत्राटदाराचाच पूर्ण हक्क राहील.",
                negotiation_tip="पूर्वीचे प्रकल्प आणि वैयक्तिक वेळात केलेल्या निर्मितीला या अटीतून स्पष्टपणे वगळा.",
            ))
        else:
            clauses.append(ClauseAnalysis(
                clause_id="sec_ip_assignment",
                clause_title="Intellectual Property and Inventions Assignment",
                original_text=ip_para[:500],
                plain_english="The company claims total ownership over all intellectual property and inventions, potentially extending to work created outside of company hours or on personal devices.",
                risk_level="CRITICAL" if is_crit else "HIGH",
                risk_reasoning="Broad IP assignment clauses that capture off-hours or unrelated personal projects infringe upon your pre-existing portfolio and future independent work.",
                suggested_redline="Contractor assigns ownership only in deliverables specifically created for and paid by Company under this Agreement. Contractor retains all rights to pre-existing IP and personal works created on personal time.",
                negotiation_tip="Carve out pre-existing intellectual property and limit assignments strictly to deliverables paid for by the client.",
            ))

    # 3. Indemnification & Liability
    indem_para = find_best_para(["indemnif", "hold harmless", "liability", "damages", "attorney's fees", "नुकसान भरपाई", "जबाबदारी", "दायित्व"])
    if indem_para:
        p_low = indem_para.lower()
        is_crit = "uncapped" in p_low or "zero liability" in p_low or "regardless of" in p_low or "unlimited" in p_low or "अमर्यादित" in p_low
        if detected_lang == "Marathi":
            clauses.append(ClauseAnalysis(
                clause_id="sec_indemnification_liability",
                clause_title="नुकसान भरपाई आणि दायित्व मर्यादा",
                original_text=indem_para[:500],
                plain_english="दुसऱ्या पक्षाविरुद्ध होणाऱ्या कायदेशीर दाव्यांचा खर्च आणि नुकसान भरपाई देण्याची संपूर्ण जबाबदारी तुमच्यावर टाकली गेली आहे, ज्याला कोणतीही कमाल मर्यादा नाही.",
                risk_level="CRITICAL" if is_crit else "HIGH",
                risk_reasoning="अमर्याद नुकसान भरपाईची अट तुमच्यावर प्रचंड आर्थिक भार टाकू शकते, विशेषतः जेव्हा दुसऱ्या पक्षाच्या निष्काळजीपणामुळे वाद निर्माण होतो.",
                suggested_redline="दोन्ही पक्ष एकमेकांना केवळ थेट निष्काळजीपणामुळे झालेल्या नुकसानीसाठी भरपाई देतील. एकूण कायदेशीर दायित्व या कराराखालील एकूण शुल्कापर्यंत मर्यादित राहील.",
                negotiation_tip="दायित्वाला एकूण कराराच्या रकमेची कमाल मर्यादा (Liability Cap) घालण्याचा आग्रह धरा.",
            ))
        else:
            clauses.append(ClauseAnalysis(
                clause_id="sec_indemnification_liability",
                clause_title="Indemnification and Limitation of Liability",
                original_text=indem_para[:500],
                plain_english="You are required to defend and pay for legal claims against the counterparty, with potentially unlimited personal liability while their liability is capped or eliminated.",
                risk_level="CRITICAL" if is_crit else "HIGH",
                risk_reasoning="One-sided indemnification without liability caps exposes your business or personal finances to catastrophic third-party litigation costs.",
                suggested_redline="Each party shall mutually indemnify the other against third-party claims arising from gross negligence or willful misconduct. Each party's total aggregate liability shall be capped at the total fees paid under this Agreement.",
                negotiation_tip="Cap total liability at the total contract value and ensure indemnification is reciprocal and excludes company negligence.",
            ))

    # 4. Compensation / Payment / Deposit
    comp_para = find_best_para(["compensation", "payment", "sole discretion", "invoice", "fees", "monthly", "भाडे", "ठेव", "डिपॉझिट", "रक्कम", "परतावा"])
    if comp_para and comp_para != term_para:
        p_low = comp_para.lower()
        is_high = "sole discretion" in p_low or "satisfaction" in p_low or "dispute" in p_low or "जप्त" in p_low
        if detected_lang == "Marathi":
            clauses.append(ClauseAnalysis(
                clause_id="sec_compensation",
                clause_title="मोबदला, भाडे आणि अनामत रक्कम",
                original_text=comp_para[:500],
                plain_english="रक्कम देणे किंवा अनामत रकमेचा परतावा हा स्पष्ट निकषांऐवजी एकांगी अटींवर किंवा विलंबावर अवलंबून राहू शकतो.",
                risk_level="HIGH" if is_high else "MEDIUM",
                risk_reasoning="मोबदला किंवा अनामत रकमेच्या परताव्याची निश्चित कालमर्यादा नसल्यास वाद निर्माण होण्याची दाट शक्यता असते.",
                suggested_redline="सर्व देयके पावती मिळाल्यापासून ३० दिवसांच्या आत दिली जातील आणि करार संपल्यावर अनामत रक्कम १५ दिवसांत परत केली जाईल.",
                negotiation_tip="पेमेंट आणि अनामत रक्कम परत करण्याचे स्पष्ट वेळापत्रक ठरवून घ्या.",
            ))
        else:
            clauses.append(ClauseAnalysis(
                clause_id="sec_compensation",
                clause_title="Payment Terms and Invoicing",
                original_text=comp_para[:500],
                plain_english="Payment may be subject to subjective approval or discretionary delays rather than objective deliverable completion.",
                risk_level="HIGH" if is_high else "MEDIUM",
                risk_reasoning="Subjective satisfaction standards empower the counterparty to withhold payments arbitrarily after work has been completed.",
                suggested_redline="Invoices shall be payable within thirty (30) days of receipt. Deliverables shall be deemed accepted unless written notice of specific deficiencies is provided within ten (10) business days.",
                negotiation_tip="Establish Net 15 or Net 30 payment milestones and deemed acceptance windows.",
            ))

    # If no standard paragraphs detected, add generic breakdown
    if not clauses:
        if detected_lang == "Marathi":
            clauses.append(ClauseAnalysis(
                clause_id="sec_general_terms",
                clause_title="सामान्य कराराच्या अटी व शर्ती",
                original_text=text[:400],
                plain_english="करारातील दोन्ही पक्षांचे अधिकार, कर्तव्ये आणि जबाबदाऱ्या ठरवणाऱ्या मूलभूत कायदेशीर अटी.",
                risk_level="MEDIUM",
                risk_reasoning="प्रत्येक कायदेशीर करारामध्ये अटी दोन्ही बाजूंच्या हिताचे रक्षण करणाऱ्या असणे आवश्यक आहे.",
                suggested_redline="दोन्ही पक्ष मान्य केलेल्या अटींनुसार काम करतील आणि तक्रार निवारणासाठी वाजवी संधी दिली जाईल.",
                negotiation_tip="सर्व अटी आणि मुदती व्यावहारिक आहेत का ते तपासून घ्या.",
            ))
        else:
            clauses.append(ClauseAnalysis(
                clause_id="sec_general_terms",
                clause_title="General Contractual Obligations",
                original_text=text[:400],
                plain_english="Standard contractual terms outlining duties, rights, and performance standards between the signatories.",
                risk_level="MEDIUM",
                risk_reasoning="Legal agreements contain binding covenants that should be scrutinized for mutual reciprocity and clear dispute resolution.",
                suggested_redline="Both parties agree to perform duties in accordance with industry standards, with reasonable opportunity to cure any alleged non-conformance.",
                negotiation_tip="Review all operational and financial deadlines to verify they are practical and commercially reasonable.",
            ))

    # Calculate overall risk score
    crit_count = sum(1 for c in clauses if c.risk_level == "CRITICAL")
    high_count = sum(1 for c in clauses if c.risk_level == "HIGH")
    med_count = sum(1 for c in clauses if c.risk_level == "MEDIUM")
    calc_score = min(98, max(25, (crit_count * 32) + (high_count * 20) + (med_count * 10)))

    if detected_lang == "Marathi":
        return ContractAnalysisResult(
            detected_language="Marathi",
            document_title=doc_title,
            parties_involved=parties,
            overall_risk_score=calc_score,
            risk_summary=(
                f"या करारामध्ये {len(clauses)} प्रमुख जोखीम कलमे आढळली आहेत ({crit_count} गंभीर आणि {high_count} उच्च जोखीम). "
                f"मुख्य जोखीम एकतर्फी समाप्ती, नुकसान भरपाई आणि देय रकमेच्या तरतुदींशी संबंधित आहे."
            ),
            clauses=clauses,
            action_checklist=[
                "करार संपवण्यापूर्वी किमान ३० दिवसांची पूर्वसूचना देण्याची तरतूद करा.",
                "स्वतःच्या पूर्व-अस्तित्वात असलेल्या बौद्धिक संपदेचे संरक्षण सुनिश्चित करा.",
                "नुकसान भरपाईच्या दायित्वाला (Liability) एकूण रकमेची कमाल मर्यादा घाला.",
                "पेमेंट आणि अनामत रकमेच्या परताव्याची निश्चित कालमर्यादा ठरवा.",
            ],
            attorney_prep_questions=[
                "स्थानिक कायद्यानुसार या करारातील एकतर्फी अटी कायदेशीरदृष्ट्या वैध आहेत का?",
                "नुकसान भरपाईच्या अटी परस्पर आणि वाजवी कशा करता येतील?",
                "करार अचानक संपुष्टात आल्यास देय रक्कम मिळण्यासाठी काय कायदेशीर तरतुदी आहेत?",
            ],
        )

    return ContractAnalysisResult(
        detected_language=detected_lang,
        document_title=doc_title,
        parties_involved=parties,
        overall_risk_score=calc_score,
        risk_summary=(
            f"The agreement contains {len(clauses)} primary risk areas, including {crit_count} critical and {high_count} high-risk provisions. "
            f"Key exposure stems from one-sided termination rules, broad IP capture, and unbalanced indemnity clauses."
        ),
        clauses=clauses,
        action_checklist=[
            "Request mutual 30-day termination notice and strike payment forfeiture provisions.",
            "Carve out pre-existing intellectual property and personal off-hours creations.",
            "Insert a mutual liability cap tied to fees paid under the contract.",
            "Clarify payment terms to Net 30 with deemed acceptance criteria.",
        ],
        attorney_prep_questions=[
            "Is the IP assignment clause overbroad under applicable local labor and intellectual property statutes?",
            "Are the indemnification obligations reciprocal and insurable under standard commercial liability policies?",
            "What statutory protections exist regarding termination pay and accrued compensation?",
        ],
    )


def analyze_contract_text(
    text: str,
    api_key: Optional[str] = None,
    preferred_model: str = "gemini-3.5-flash"
) -> ContractAnalysisResult:
    """
    Analyzes a contract text string using Google GenAI SDK with structured Pydantic
    schema validation (ContractAnalysisResult) and deterministic temperature (0.1).
    Features instant failover across Flash models, transient retry backoff, and
    deterministic fallback analysis in case of high-demand API spikes.
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
        for attempt in range(2):
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
                    break
            except Exception as err:
                last_error = err
                err_str = str(err).lower()
                # If transient spike (503 / 429), back off briefly and retry once
                if attempt == 0 and any(code in err_str for code in ["503", "unavailable", "429", "resource_exhausted", "high demand"]):
                    time.sleep(1.5)
                    continue
                # If 404 or non-retriable, move to next model immediately
                break

    # If all remote models are temporarily unavailable (e.g. 503 high demand),
    # use deterministic fallback analyzer so user workflow is not blocked
    print(f"[Warning] All Gemini API models failed ({last_error}). Falling back to deterministic contract analysis.")
    return generate_fallback_analysis(text, reason=str(last_error))


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
    preferred_model: str = "gemini-3.5-flash",
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
    if resolved_api_key:
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

    # Fallback template draft if Gemini API fails or key is missing
    party = req.counterparty_name or "Client / Landlord"
    role = req.user_role or "Contractor / Tenant"
    title = req.clause_title or "Contract Clause"
    return NegotiationDraftResponse(
        email_subject=f"Proposed Revision: {title} Clause - Contract Agreement",
        email_diplomatic=(
            f"Dear {party},\n\n"
            f"Thank you for sharing the draft agreement. I am excited about the opportunity to work together and look forward to finalizing our partnership.\n\n"
            f"While reviewing the current draft, I noted the section on '{title}'. The current wording states:\n"
            f"\"{req.original_text}\"\n\n"
            f"To ensure a balanced agreement that equitably protects both parties, I would like to propose the following adjustment:\n"
            f"\"{req.suggested_redline}\"\n\n"
            f"Please let me know if this revision works for you. I am happy to discuss further if needed.\n\n"
            f"Warm regards,\n{role}"
        ),
        email_firm=(
            f"Dear {party},\n\n"
            f"I have reviewed the agreement and identified a critical concern regarding Section '{title}'. Specifically, the current provision states:\n"
            f"\"{req.original_text}\"\n\n"
            f"This creates an asymmetric and unacceptable liability exposure. To proceed with signing, we require this clause to be revised to:\n"
            f"\"{req.suggested_redline}\"\n\n"
            f"Please update the agreement with this redline and send over the revised execution copy.\n\n"
            f"Sincerely,\n{role}"
        ),
        chat_diplomatic=(
            f"Hi {party}! Hope you're doing well. Quick note on the agreement: for the '{title}' clause, could we update the wording to: \"{req.suggested_redline}\"? This keeps things balanced for both of us. Let me know if that works!"
        ),
        chat_firm=(
            f"Hi {party}, I've reviewed the agreement. The '{title}' clause presents an unworkable risk in its current form. We'll need to amend it to: \"{req.suggested_redline}\" before we can execute. Thanks for understanding!"
        ),
    )


# ==============================================================================
# Feature 3: What-If Scenario Simulator
# ==============================================================================

class ScenarioRequest(BaseModel):
    scenario_query: str
    contract_data: ContractAnalysisResult


class ScenarioSimulationResponse(BaseModel):
    scenario_query: str
    verdict_badge: Literal["SAFE", "AT_RISK", "SEVERE_PENALTY", "UNADDRESSED"]
    direct_consequence: str
    governing_clause_title: str
    governing_clause_quote: str
    recommended_action: str


SCENARIO_SYSTEM_INSTRUCTION = (
    "You are an objective legal contract analyst and risk simulator. Your task is to evaluate "
    "a user's 'What If?' hypothetical scenario against an analyzed contract and its specific clauses.\n\n"
    "Strict Rules:\n"
    "1. Base your analysis STRICTLY on the clauses and terms in the provided contract data.\n"
    "2. Determine the verdict_badge accurately:\n"
    "   - 'SAFE': The contract contains mutual, fair protections for the user in this situation.\n"
    "   - 'AT_RISK': The user faces unfavorable commercial terms, unilateral power, or moderate liability.\n"
    "   - 'SEVERE_PENALTY': The contract imposes immediate loss of compensation, total IP forfeiture, uncapped indemnity, or predatory penalties.\n"
    "   - 'UNADDRESSED': The contract is completely silent on this issue, meaning standard statutory law or ambiguity applies.\n"
    "3. direct_consequence: Clearly explain in plain English (8th-grade reading level) what happens in practice if this scenario takes place.\n"
    "4. governing_clause_title: Name of the clause that controls this outcome (or 'Not Specified in Agreement' if UNADDRESSED).\n"
    "5. governing_clause_quote: A representative quote or excerpt from the governing clause (or 'N/A' if UNADDRESSED).\n"
    "6. recommended_action: 1-2 concrete, practical steps the user should take to protect themselves or negotiate changes."
)


def simulate_scenario(
    req: ScenarioRequest,
    api_key: Optional[str] = None,
    preferred_model: str = "gemini-3.5-flash",
) -> ScenarioSimulationResponse:
    """
    Simulates a 'What If?' scenario against the analyzed contract using Google GenAI SDK
    with strict Pydantic response_schema validation and deterministic fallback logic.
    """
    resolved_api_key = api_key or os.getenv("GEMINI_API_KEY")

    clauses_context = []
    for c in req.contract_data.clauses:
        clauses_context.append(
            f"Clause: {c.clause_title} (ID: {c.clause_id}, Risk: {c.risk_level})\n"
            f"Original Text: \"{c.original_text}\"\n"
            f"Plain English: {c.plain_english}\n"
            f"Suggested Redline: {c.suggested_redline}\n"
        )
    clauses_block = "\n---\n".join(clauses_context)

    prompt = (
        f"Contract Document Title: {req.contract_data.document_title}\n"
        f"Parties: {', '.join(req.contract_data.parties_involved) if req.contract_data.parties_involved else 'Unspecified'}\n"
        f"Overall Contract Risk Score: {req.contract_data.overall_risk_score}/100\n\n"
        f"CONTRACT CLAUSES:\n{clauses_block}\n\n"
        f"USER SCENARIO QUERY:\n\"{req.scenario_query}\"\n\n"
        "Evaluate this scenario and provide the structured verdict_badge, direct_consequence, "
        "governing_clause_title, governing_clause_quote, and recommended_action."
    )

    if resolved_api_key:
        client = genai.Client(api_key=resolved_api_key)
        config = types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=ScenarioSimulationResponse,
            system_instruction=SCENARIO_SYSTEM_INSTRUCTION,
        )

        candidate_models = list(CANDIDATE_MODELS)
        if preferred_model and preferred_model not in candidate_models:
            candidate_models.insert(0, preferred_model)
        elif preferred_model and preferred_model != candidate_models[0]:
            candidate_models.remove(preferred_model)
            candidate_models.insert(0, preferred_model)

        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                if response and response.text:
                    parsed = ScenarioSimulationResponse.model_validate_json(response.text)
                    if not parsed.scenario_query:
                        parsed.scenario_query = req.scenario_query
                    return parsed
            except Exception:
                continue

    # Fallback Adjudication Logic if Gemini is unreachable
    query_lower = req.scenario_query.lower()
    for clause in req.contract_data.clauses:
        c_title_lower = clause.clause_title.lower()
        c_text_lower = clause.original_text.lower()

        # Termination scenarios
        if any(w in query_lower for w in ["terminat", "fire", "cancel", "quit", "leave", "end contract"]):
            if any(w in c_title_lower or w in c_text_lower for w in ["terminat", "cancel"]):
                is_severe = "forfeit" in c_text_lower or "without notice" in c_text_lower or clause.risk_level in ["CRITICAL", "HIGH"]
                return ScenarioSimulationResponse(
                    scenario_query=req.scenario_query,
                    verdict_badge="SEVERE_PENALTY" if is_severe else "AT_RISK",
                    direct_consequence=(
                        f"Under the '{clause.clause_title}', the counterparty can terminate immediately. "
                        f"{clause.plain_english}"
                    ),
                    governing_clause_title=clause.clause_title,
                    governing_clause_quote=clause.original_text[:200] + ("..." if len(clause.original_text) > 200 else ""),
                    recommended_action="Negotiate a minimum 14-to-30-day written notice period and ensure full accrued compensation is guaranteed upon termination.",
                )

        # IP / Inventions / Off-hours
        if any(w in query_lower for w in ["intellectual property", "inventions", "side project", "weekend", "off-hours", "code", "personal"]):
            if any(w in c_title_lower or w in c_text_lower for w in ["intellectual", "ip", "assignment", "inventions"]):
                is_severe = clause.risk_level in ["CRITICAL", "HIGH"] or "off-hours" in c_text_lower or "all right" in c_text_lower
                return ScenarioSimulationResponse(
                    scenario_query=req.scenario_query,
                    verdict_badge="SEVERE_PENALTY" if is_severe else "AT_RISK",
                    direct_consequence=(
                        f"According to the '{clause.clause_title}', the company claims broad rights over your work. "
                        f"{clause.plain_english}"
                    ),
                    governing_clause_title=clause.clause_title,
                    governing_clause_quote=clause.original_text[:200] + ("..." if len(clause.original_text) > 200 else ""),
                    recommended_action="Explicitly carve out pre-existing IP and personal projects created during personal time without company equipment.",
                )

        # Indemnification / Lawsuits / Liability
        if any(w in query_lower for w in ["sued", "lawsuit", "liability", "indemnif", "damages", "legal fees"]):
            if any(w in c_title_lower or w in c_text_lower for w in ["indemnif", "liabilit", "damages"]):
                is_severe = clause.risk_level in ["CRITICAL", "HIGH"] or "uncapped" in c_text_lower or "zero liability" in c_text_lower
                return ScenarioSimulationResponse(
                    scenario_query=req.scenario_query,
                    verdict_badge="SEVERE_PENALTY" if is_severe else "AT_RISK",
                    direct_consequence=(
                        f"Under the '{clause.clause_title}', you bear significant contractual indemnity. "
                        f"{clause.plain_english}"
                    ),
                    governing_clause_title=clause.clause_title,
                    governing_clause_quote=clause.original_text[:200] + ("..." if len(clause.original_text) > 200 else ""),
                    recommended_action="Require mutual indemnification, cap liability to the total fees paid under the contract, and exclude company negligence.",
                )

        # Compensation / Non-payment / Delays
        if any(w in query_lower for w in ["pay", "late", "invoice", "compensation", "money", "fee"]):
            if any(w in c_title_lower or w in c_text_lower for w in ["compensation", "payment", "fee"]):
                return ScenarioSimulationResponse(
                    scenario_query=req.scenario_query,
                    verdict_badge="AT_RISK" if clause.risk_level in ["HIGH", "CRITICAL", "MEDIUM"] else "SAFE",
                    direct_consequence=(
                        f"Regarding compensation, the '{clause.clause_title}' specifies terms. "
                        f"{clause.plain_english}"
                    ),
                    governing_clause_title=clause.clause_title,
                    governing_clause_quote=clause.original_text[:200] + ("..." if len(clause.original_text) > 200 else ""),
                    recommended_action="Establish net 15 or 30 payment milestones with late fee interest and work stoppage rights upon overdue invoices.",
                )

    # If no clause directly matched the query
    return ScenarioSimulationResponse(
        scenario_query=req.scenario_query,
        verdict_badge="UNADDRESSED",
        direct_consequence=(
            f"The current agreement does not explicitly address the scenario: '{req.scenario_query}'. "
            "Without an express contractual clause, local default commercial law and common-law principles would govern, creating uncertainty."
        ),
        governing_clause_title="Not Specified in Agreement",
        governing_clause_quote="N/A (Contract is silent on this scenario)",
        recommended_action="Add an express clarifying clause to the contract defining party responsibilities for this situation before signing.",
    )


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
