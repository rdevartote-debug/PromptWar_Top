import io
import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from backend.main import app, MAX_FILE_SIZE_BYTES
from backend.analyze_contract import ContractAnalysisResult, ClauseAnalysis, NegotiationDraftResponse, ScenarioSimulationResponse

client = TestClient(app)

MOCK_CONTRACT_TEXT = """
INDEPENDENT SERVICES AGREEMENT
This Agreement is between Client Corp and John Doe.
Section 1. Termination: Either party may terminate with 30 days notice.
Section 2. Liability: Limited to fees paid.
"""

MOCK_MARATHI_CONTRACT_TEXT = """
घरभाडे करारनामा
हा करारनामा घरमालक रमेश पाटील आणि भाडेकरू सचिन जोशी यांच्यात झाला आहे.
कलम १. करार समाप्ती: घरमालक कोणतीही पूर्वसूचना न देता करार तात्काळ संपुष्टात आणू शकतो.
"""

MOCK_ANALYSIS_DATA = {
    "detected_language": "English",
    "document_title": "Independent Services Agreement",
    "parties_involved": ["Client Corp", "John Doe"],
    "overall_risk_score": 45,
    "risk_summary": "Moderate risk agreement with standard termination rules.",
    "clauses": [
        {
            "clause_id": "sec_termination",
            "clause_title": "Termination Notice",
            "original_text": "Section 1. Termination: Either party may terminate with 30 days notice.",
            "plain_english": "You or the client can end this contract by giving 30 days written notice.",
            "risk_level": "LOW",
            "risk_reasoning": "Standard mutual notice protects both parties.",
            "suggested_redline": "Either party may terminate upon thirty (30) days notice.",
            "negotiation_tip": "Keep the mutual 30 days notice requirement."
        }
    ],
    "action_checklist": ["Review payment schedule."],
    "attorney_prep_questions": ["Is 30 days sufficient notice?"]
}


# ==============================================================================
# 1. Health and Root Endpoint Tests
# ==============================================================================

def test_root_endpoint():
    """Verify GET / returns 200 OK and service documentation metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "LegalDoc.AI" in data["service"]
    assert data["docs"] == "/docs"
    assert data["health"] == "/api/health"


def test_health_check_endpoint():
    """Verify GET /api/health returns 200 OK and healthy status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "gemini_configured" in data


# ==============================================================================
# 2. Contract Analysis Endpoint Tests (200 OK, Error Handling, File Size, Types)
# ==============================================================================

@patch("backend.main.analyze_contract_text")
def test_analyze_contract_txt_success(mock_analyze):
    """Verify POST /api/analyze processes valid .txt files and returns 200 OK."""
    mock_analyze.return_value = ContractAnalysisResult(**MOCK_ANALYSIS_DATA)

    files = {"file": ("contract.txt", MOCK_CONTRACT_TEXT.encode("utf-8"), "text/plain")}
    response = client.post("/api/analyze", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["document_title"] == "Independent Services Agreement"
    assert data["overall_risk_score"] == 45
    assert len(data["clauses"]) == 1
    assert data["detected_language"] == "English"


@patch("backend.main.analyze_contract_text")
def test_analyze_contract_native_marathi_success(mock_analyze):
    """Verify POST /api/analyze auto-detects and preserves native Marathi outputs."""
    marathi_data = dict(MOCK_ANALYSIS_DATA)
    marathi_data["detected_language"] = "Marathi"
    marathi_data["document_title"] = "घरभाडे करारनामा"
    marathi_data["risk_summary"] = "हा करारनामा मध्यम स्वरूपाच्या जोखमीचा आहे."
    mock_analyze.return_value = ContractAnalysisResult(**marathi_data)

    files = {"file": ("marathi_lease.txt", MOCK_MARATHI_CONTRACT_TEXT.encode("utf-8"), "text/plain")}
    response = client.post("/api/analyze", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "Marathi"
    assert data["document_title"] == "घरभाडे करारनामा"


def test_analyze_contract_unsupported_extension_400():
    """Verify POST /api/analyze rejects unsupported file extensions with 400 Bad Request."""
    files = {"file": ("malicious.exe", b"binarycontent", "application/octet-stream")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_analyze_contract_empty_file_400():
    """Verify POST /api/analyze rejects empty uploads with 400 Bad Request."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


def test_analyze_contract_file_too_large_400():
    """Verify POST /api/analyze rejects files exceeding 15MB with 400 Bad Request."""
    oversized_bytes = b"X" * (MAX_FILE_SIZE_BYTES + 1024)
    files = {"file": ("huge_contract.txt", oversized_bytes, "text/plain")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 400
    assert "exceeds maximum limit" in response.json()["detail"]


def test_analyze_contract_insufficient_text_422():
    """Verify POST /api/analyze rejects files with less than 20 characters."""
    files = {"file": ("short.txt", b"Too short", "text/plain")}
    response = client.post("/api/analyze", files=files)
    assert response.status_code == 422
    assert "sufficient text" in response.json()["detail"].lower()


# ==============================================================================
# 3. What-If Scenario Simulator Tests (200 OK, Validation Errors)
# ==============================================================================

@patch("backend.main.simulate_scenario")
def test_simulate_scenario_success(mock_sim):
    """Verify POST /api/simulate-scenario processes valid hypothetical queries."""
    mock_sim.return_value = ScenarioSimulationResponse(
        scenario_query="What if I get terminated without notice?",
        verdict_badge="SAFE",
        direct_consequence="You receive 30 days notice under the termination clause.",
        governing_clause_title="Termination Notice",
        governing_clause_quote="Section 1. Termination: Either party may terminate with 30 days notice.",
        recommended_action="No change needed."
    )

    payload = {
        "scenario_query": "What if I get terminated without notice?",
        "contract_data": MOCK_ANALYSIS_DATA
    }
    response = client.post("/api/simulate-scenario", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict_badge"] == "SAFE"
    assert "Termination" in data["governing_clause_title"]


def test_simulate_scenario_bad_json_validation_error():
    """Verify POST /api/simulate-scenario returns 422 Unprocessable Entity for invalid JSON."""
    # Empty query violates min_length=3 validator
    invalid_payload = {
        "scenario_query": "  ",
        "contract_data": MOCK_ANALYSIS_DATA
    }
    response = client.post("/api/simulate-scenario", json=invalid_payload)
    assert response.status_code == 422


def test_simulate_scenario_missing_contract_data_validation_error():
    """Verify POST /api/simulate-scenario returns 422 when required contract_data is omitted."""
    invalid_payload = {
        "scenario_query": "Can the client withhold my payments?"
    }
    response = client.post("/api/simulate-scenario", json=invalid_payload)
    assert response.status_code == 422


# ==============================================================================
# 4. Negotiation Drafts & Export Tests (200 OK)
# ==============================================================================

@patch("backend.main.generate_negotiation_draft")
def test_negotiate_draft_success(mock_draft):
    """Verify POST /api/negotiate-draft generates multi-tone responses."""
    mock_draft.return_value = NegotiationDraftResponse(
        email_subject="Proposed Amendment: Termination Notice",
        email_diplomatic="Dear Client, thank you for the draft...",
        email_firm="Dear Client, we require an amendment...",
        chat_diplomatic="Hi! Could we adjust the notice period?",
        chat_firm="Hi, please update the notice clause to 30 days."
    )

    payload = {
        "clause_title": "Termination Notice",
        "original_text": "Company may terminate immediately without notice.",
        "suggested_redline": "Either party may terminate upon 30 days notice.",
        "counterparty_name": "Apex Corp",
        "user_role": "Lead Architect"
    }
    response = client.post("/api/negotiate-draft", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Amendment" in data["email_subject"]
    assert "diplomatic" in data["email_diplomatic"].lower() or "client" in data["email_diplomatic"].lower()


@patch("backend.main.generate_report_pdf")
def test_export_pdf_report_success(mock_pdf):
    """Verify POST /api/export-pdf returns a valid streaming PDF attachment."""
    fake_pdf = io.BytesIO(b"%PDF-1.4 Mock PDF Content")
    mock_pdf.return_value = fake_pdf

    response = client.post("/api/export-pdf", json=MOCK_ANALYSIS_DATA)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]


@patch("backend.main.generate_docx_track_changes")
def test_export_docx_success(mock_docx):
    """Verify POST /api/export-docx returns a valid Word document attachment."""
    fake_docx = io.BytesIO(b"PK\x03\x04 Mock DOCX Content")
    mock_docx.return_value = fake_docx

    payload = {
        "document_title": "Independent Contractor Agreement",
        "original_full_text": MOCK_CONTRACT_TEXT,
        "clauses": MOCK_ANALYSIS_DATA["clauses"]
    }
    response = client.post("/api/export-docx", json=payload)
    assert response.status_code == 200
    assert "wordprocessingml.document" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
