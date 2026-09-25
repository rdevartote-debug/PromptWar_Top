# ⚖️ LegalDoc.AI — AI-Powered Contract Risk & Legal Analysis Engine

> **Democratizing contract review through deterministic AI analysis, plain-English translation, unfair clause detection, and balanced negotiation redlines.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python)](https://www.python.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-Gemini%20Flash-4285F4?style=flat&logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)

---

## 📌 Table of Contents

- [Why LegalDoc.AI? (The Problem)](#-why-legaldocai-the-problem)
- [The Solution & Mission](#-the-solution--mission)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
  - [Environment Configuration](#3-environment-configuration)
- [API Reference](#-api-reference)
- [Data Schema & Structured Outputs](#-data-schema--structured-outputs)
- [Ethical & Legal Disclaimer](#-ethical--legal-disclaimer)

---

## 🔍 Why LegalDoc.AI? (The Problem)

In today's economy, individuals, freelancers, startup founders, consultants, and consumers regularly sign legally binding contracts:
- **Independent Contractor Agreements**
- **Non-Disclosure Agreements (NDAs)**
- **Employment Contracts & Offer Letters**
- **Software as a Service (SaaS) Master Services Agreements (MSAs)**
- **Intellectual Property (IP) Assignment Deeds**

### The Core Challenges:
1. **The Asymmetry of "Legalese"**: Enterprise contracts are drafted by specialized legal teams using archaic, convoluted phrasing designed to minimize corporate risk at the expense of the counterparty.
2. **Hidden Liability Traps**: One-sided clauses—such as off-hours personal IP assignment, uncapped indemnification, unilateral termination without notice, and total forfeiture of accrued earnings—are often buried deep within boilerplate sections.
3. **Prohibitive Legal Costs**: Retaining a contract attorney for initial document review typically costs between **$300 to $1,000+ per hour**, making thorough legal vetting inaccessible for freelancers, gig workers, and early-stage entrepreneurs.
4. **Negotiation Paralysis**: Even when a signer senses that a term is unfair, they often lack the legal vocabulary and tactical counter-proposals necessary to negotiate a balanced amendment with confidence.

---

## 💡 The Solution & Mission

**LegalDoc.AI** serves as an intelligent, objective contract copilot. It ingests complex legal agreements (`.pdf`, `.docx`, `.txt`), parses their structure, and runs them through a deterministic AI risk assessment pipeline powered by **Google Gemini** and **FastAPI**.

### What It Delivers:
- **Plain-English Translation**: Demystifies convoluted legal jargon into clear language at an 8th-grade reading level.
- **Objective Risk Scoring (0–100)**: Calculates a composite risk rating indicating whether the agreement is standard, cautious, or predatory.
- **Clause-Level Severity Breakdown**: Categorizes terms into `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` risk tiers with explicit rationales.
- **Copy-Ready Redline Counter-Proposals**: Generates equitable, balanced substitute clause language that can be pasted directly into negotiations.
- **Action Checklist & Attorney Brief**: Builds a pre-signing to-do list and strategic interview questions for users who consult legal counsel.

---

## ✨ Key Features

### 📑 1. Multi-Format Document Ingestion
- Upload `.pdf`, `.docx`, or `.txt` files up to **10MB**.
- Automated multi-page text extraction utilizing `pypdf` and `python-docx` with encoding fallbacks.
- Instant preloaded **Sample Predatory Contract** mode to evaluate system capabilities without uploading personal documents.

### 🎯 2. Dynamic Risk Meter & Executive Summary
- Visual composite score gauge ranging from **0 (Safe/Standard)** to **100 (Predatory/High Risk)**.
- High-level executive synthesis summarizing the critical threats and party roles in 2–3 concise sentences.

### 🛡️ 3. Clause Analysis & Split View
- **Tabbed Review Interface**:
  - **Plain English**: Simplified explanation highlighting what the clause practically means for the signer.
  - **Original Legalese**: The exact contractual text extracted from the document.
  - **Split View**: Side-by-side comparison for immediate contrast.
- **Negotiation Tips**: Practical talking points to persuade counterparties to accept amendments.
- **One-Click Redline Copying**: Instant clipboard copy for ready-to-use alternative wording.

### 🏷️ 4. Risk Severity Filtering
- Rapidly filter clauses by risk status:
  - 🔴 **Critical**: Predatory terms requiring immediate amendment before signing.
  - 🟠 **High**: Significant imbalances, one-sided liabilities, or broad restrictions.
  - 🟡 **Medium**: Ambiguities or slightly unfavorable commercial terms.
  - 🟢 **Low**: Standard, balanced, or mutual protections.

### 📋 5. Pre-Signing Action Checklist
- Prioritized task checklist to verify insurance, payment escrow, IP carve-outs, and notices before execution.
- Interactive progress bar tracking checklist completion.

### ⚖️ 6. Attorney Preparation Questions & Print Brief
- Curated list of high-leverage legal questions to ask an attorney.
- **One-click copy** to send via email or message.
- **Print Brief capability** (`Ctrl+P` / Print View) to generate a hard copy or PDF summary for formal legal consultations.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       User Interface                        │
│             Next.js 16 (React 19) + Tailwind CSS v4         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Multipart Form Data (.pdf/.docx/.txt)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Engine                   │
│  • File Type Validation & 10MB Threshold Checks             │
│  • Text Extraction Pipeline (pypdf, python-docx)            │
│  • CORS Middleware & Error Handlers                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Extracted Clean Text
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Google GenAI Engine (Gemini Flash)               │
│  • Strict Pydantic Schema Validation (ContractAnalysisResult)│
│  • Deterministic Temperature (0.1)                          │
│  • Automated Model Fallback Cascade                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Validated Structured JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Client Dashboard                       │
│  • Risk Meter (0-100)        • Clause Cards & Redlines      │
│  • Severity Filter           • Interactive Action Checklist │
│  • Split Legalese View       • Attorney Brief & Export      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | High-performance React framework with server/client hybrid rendering. |
| **UI Library** | **React 19 & TypeScript 5** | Type-safe, component-driven reactive user interface. |
| **Styling** | **Tailwind CSS v4 & PostCSS** | Modern utility-first CSS engine with dark mode styling and animations. |
| **Icons** | **Lucide React** | Clean, accessible vector icons for legal status badges and actions. |
| **Backend Framework** | **FastAPI (Python 3.10+)** | High-speed, asynchronous Python API with automatic OpenAPI docs. |
| **ASGI Server** | **Uvicorn** | Fast, production-grade ASGI web server implementation. |
| **AI / LLM Engine** | **Google GenAI SDK** | Gemini models (`gemini-3.5-flash-lite`, fallback to `gemini-3.6-flash`, `gemini-flash-latest`). |
| **Schema Validation** | **Pydantic v2** | Enforces strict JSON schema guarantees on Gemini AI responses. |
| **Document Parsers** | **pypdf & python-docx** | Robust binary text extraction from PDF and Word documents. |

---

## 📂 Project Structure

```text
Legal_doc_ai/
├── .env                       # Root environment configuration (API keys)
├── .gitignore                 # Root Git ignore rules
├── mockData.json              # Reference benchmark analysis dataset
├── package.json               # Monorepo task runner scripts
│
├── backend/                   # Python FastAPI Backend
│   ├── analyze_contract.py    # Gemini GenAI prompt, Pydantic schemas & fallback logic
│   ├── main.py                # FastAPI endpoints, file parser & CORS setup
│   └── requirements.txt       # Python dependencies
│
└── frontend/                  # Next.js 16 Frontend Application
    ├── package.json           # Frontend dependencies & scripts
    ├── tsconfig.json          # TypeScript compiler configuration
    ├── next.config.ts         # Next.js runtime configuration
    ├── public/                # Static assets & icons
    └── src/
        ├── app/
        │   ├── globals.css    # Tailwind CSS v4 styling & theme setup
        │   ├── layout.tsx     # Root HTML layout & font definitions
        │   └── page.tsx       # Main Contract Analysis Dashboard
        ├── components/
        │   ├── ActionSidebar.tsx          # Checklist & Attorney Brief
        │   ├── AnalysisLoader.tsx         # Multi-step AI processing spinner
        │   ├── ClauseCard.tsx             # Clause detail, plain text & redlines
        │   ├── FileUploadZone.tsx         # Drag-and-drop document upload area
        │   ├── Header.tsx                 # Navigation bar & status indicator
        │   ├── LegalDisclaimerBanner.tsx  # Statutory legal disclosure banner
        │   └── RiskMeter.tsx              # Composite risk gauge & summary
        ├── data/
        │   └── mockData.json              # Pre-bundled sample predatory agreement
        ├── lib/
        │   └── api.ts                     # Fetch client communicating with FastAPI
        └── types/
            └── contract.ts                # TypeScript interfaces for contract data
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- **Node.js**: `v18.18+` or `v20+`
- **Python**: `3.10+`
- **Google Gemini API Key**: Obtain a key from [Google AI Studio](https://aistudio.google.com/).

---

### 1. Backend Setup

1. Open your terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your `.env` file in the root directory (or in `backend/`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. Launch the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The API will start at `http://127.0.0.1:8000` with interactive docs at `http://127.0.0.1:8000/docs`.*

---

### 2. Frontend Setup

1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Configure frontend environment variables in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```
   *(Defaults to `http://127.0.0.1:8000` if not specified).*

4. Start the development server:
   ```bash
   npm run dev
   ```
   *Access the web application at `http://localhost:3000`.*

---

### 3. Monorepo Convenience Scripts

From the root repository directory:
```bash
# Launch Next.js frontend dev server
npm run dev

# Build frontend for production
npm run build

# Start production server
npm run start
```

---

## 📡 API Reference

### 1. Health Status
- **Endpoint**: `GET /api/health`
- **Description**: Verifies backend server health and checks whether `GEMINI_API_KEY` is present.
- **Sample Response**:
  ```json
  {
    "status": "healthy",
    "service": "LegalDoc.AI Backend",
    "gemini_configured": true
  }
  ```

---

### 2. Contract Analysis
- **Endpoint**: `POST /api/analyze`
- **Content-Type**: `multipart/form-data`
- **Payload**:
  - `file`: Document file (`.pdf`, `.docx`, `.txt`)
- **Max File Size**: 10 MB
- **Response**: `ContractAnalysisResult` (structured JSON)

---

### 3. Executive PDF Report Export
- **Endpoint**: `POST /api/export-pdf`
- **Content-Type**: `application/json`
- **Payload**: `ContractAnalysisResult` JSON object
- **Response**: `application/pdf` binary stream (`LegalDoc_Analysis_Report.pdf`)

---

## 📊 Data Schema & Structured Outputs

The backend guarantees schema compliance through Pydantic v2:

```typescript
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ClauseAnalysis {
  clause_id: string;            // e.g. "sec_ip_assignment"
  clause_title: string;         // e.g. "Comprehensive Off-Hours IP Assignment"
  original_text: string;        // Verbatim or extracted text from document
  plain_english: string;        // 8th-grade reading level translation
  risk_level: RiskLevel;        // LOW | MEDIUM | HIGH | CRITICAL
  risk_reasoning: string;       // Why this clause poses a risk
  suggested_redline: string;    // Fair, balanced counter-proposal wording
  negotiation_tip: string;      // Actionable advice for negotiating changes
}

export interface ContractAnalysisResult {
  document_title: string;       // Document title or inferred agreement type
  parties_involved: string[];   // Identified entities / individuals
  overall_risk_score: number;   // 0 (Safe) to 100 (Predatory)
  risk_summary: string;         // High-level executive overview
  clauses: ClauseAnalysis[];    // Breakdown of all analyzed clauses
  action_checklist: string[];   // Critical steps before signing
  attorney_prep_questions: string[]; // High-leverage counsel discussion points
}
```

---

## ⚖️ Ethical & Legal Disclaimer

> **IMPORTANT NOTICE:**  
> **LegalDoc.AI is an AI-powered educational and document review assistance tool.**  
> - It **does not constitute formal legal advice**.
> - It **does not create an attorney-client relationship**.
> - Contracts carry binding financial, operational, and personal legal consequences. For high-stakes or sensitive transactions, users are strongly advised to retain a qualified, licensed attorney in their jurisdiction. The generated redlines and questions are intended to facilitate informed conversations with professional legal counsel.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to open an issue or submit a pull request to help make legal contracts transparent and fair for everyone.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
