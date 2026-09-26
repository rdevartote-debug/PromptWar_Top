import {
  ContractAnalysisResult,
  DocxExportRequest,
  NegotiationDraftRequest,
  NegotiationDraftResponse,
  ScenarioRequest,
  ScenarioSimulationResponse,
} from '@/types/contract';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Uploads a contract file (.pdf, .docx, .txt) to the FastAPI backend
 * and returns the validated structured ContractAnalysisResult.
 */
export async function analyzeContract(file: File): Promise<ContractAnalysisResult> {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  const fileName = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

  if (!isAllowed) {
    throw new ApiError(
      `Unsupported file format. Please upload a .pdf, .docx, or .txt file.`,
      400
    );
  }

  // File size limit: 10MB
  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new ApiError(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is ${MAX_SIZE_MB}MB.`,
      400
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    const data: ContractAnalysisResult = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown network connection error';
    throw new ApiError(
      `Could not connect to analysis service at ${API_BASE_URL}. Ensure FastAPI backend is running. (${message})`,
      0
    );
  }
}

/**
 * Checks backend health status.
 */
export async function checkBackendHealth(): Promise<{ status: string; gemini_configured: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { status: 'offline', gemini_configured: false };
  }
}

/**
 * Sends current ContractAnalysisResult to FastAPI backend to generate
 * an executive PDF report and automatically triggers browser download.
 */
export async function downloadPdfReport(analysis: ContractAnalysisResult): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/export-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysis),
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    let filename = 'LegalDoc_Analysis_Report.pdf';
    const disposition = response.headers.get('Content-Disposition');
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          filename = decodeURIComponent(utf8Match[1]);
        } catch {
          // fallback
        }
      } else {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
    } else if (analysis.document_title) {
      const safeTitle = analysis.document_title
        .replace(/[^a-zA-Z0-9_\u0900-\u097F-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 30);
      filename = `LegalDoc_${safeTitle}_Report.pdf`;
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown network connection error';
    throw new ApiError(
      `Could not generate PDF report from ${API_BASE_URL}. Ensure backend is running. (${message})`,
      0
    );
  }
}

/**
 * Sends DocxExportRequest to FastAPI backend to generate
 * an amended Word (.docx) document with Track-Changes styling
 * and automatically triggers browser download.
 */
export async function downloadDocxRedline(req: DocxExportRequest): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/export-docx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail);
        }
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    let filename = 'LegalDoc_Amended_Redline.docx';
    const disposition = response.headers.get('Content-Disposition');
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          filename = decodeURIComponent(utf8Match[1]);
        } catch {
          // fallback
        }
      } else {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
    } else if (req.document_title) {
      const safeTitle = req.document_title
        .replace(/[^a-zA-Z0-9_\u0900-\u097F-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 30);
      filename = `LegalDoc_${safeTitle}_Amended_Redline.docx`;
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown network connection error';
    throw new ApiError(
      `Could not generate Word document from ${API_BASE_URL}. Ensure backend is running. (${message})`,
      0
    );
  }
}

/**
 * Calls FastAPI backend to generate context-tailored negotiation drafts
 * (Email & Chat, in Diplomatic and Firm tones) for a specific contract clause.
 */
export async function generateNegotiationDraft(
  req: NegotiationDraftRequest
): Promise<NegotiationDraftResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/negotiate-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage =
            typeof errorData.detail === 'string'
              ? errorData.detail
              : JSON.stringify(errorData.detail);
        }
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    const data: NegotiationDraftResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      console.warn('Backend draft API error, using intelligent client fallback:', err.message);
    }
    // High-quality client fallback if backend is offline or errors
    const party = req.counterparty_name || 'Client / Landlord';
    const role = req.user_role || 'Contractor / Tenant';
    const title = req.clause_title || 'Contract Clause';

    return {
      email_subject: `Proposed Revision: ${title} Clause - Contract Discussion`,
      email_diplomatic: `Dear ${party},\n\nThank you for sharing the draft agreement. I am enthusiastic about our collaboration and look forward to finalizing the terms.\n\nWhile reviewing the current language, I noticed the section regarding '${title}':\n"${req.original_text}"\n\nTo ensure our agreement remains fair and balanced for both parties, I would like to propose the following alternative wording:\n"${req.suggested_redline}"\n\nPlease let me know if this revision works for you. I am happy to hop on a brief call if you'd like to discuss.\n\nWarm regards,\n${role}`,
      email_firm: `Dear ${party},\n\nI have completed my review of the proposed contract and identified a critical commercial and legal issue with the '${title}' clause:\n"${req.original_text}"\n\nThis term exposes our side to an unbudgeted liability risk. Before we can execute this agreement, we require the following redline to be incorporated:\n"${req.suggested_redline}"\n\nPlease send over an updated copy with this modification so we can proceed with signing.\n\nSincerely,\n${role}`,
      chat_diplomatic: `Hi ${party}! Hope you're doing well. Quick note on the agreement: for the '${title}' section, could we update the wording to: "${req.suggested_redline}"? This balances the risk nicely. Let me know if that works for you!`,
      chat_firm: `Hi ${party}, reviewed the contract. The '${title}' clause poses an unworkable risk for us in its current state. We'll need to update it to: "${req.suggested_redline}" prior to signing. Thanks!`,
    };
  }
}

/**
 * Sends a 'What If?' hypothetical scenario query and contract context to
 * FastAPI backend to simulate grounded legal and financial consequences.
 */
export async function simulateScenario(
  req: ScenarioRequest
): Promise<ScenarioSimulationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/simulate-scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage =
            typeof errorData.detail === 'string'
              ? errorData.detail
              : JSON.stringify(errorData.detail);
        }
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    const data: ScenarioSimulationResponse = await response.json();
    return data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      console.warn('Backend scenario API error, using intelligent client fallback:', err.message);
    }

    // Client-side grounded simulation fallback
    const queryLower = req.scenario_query.toLowerCase();
    for (const clause of req.contract_data.clauses) {
      const cTitle = clause.clause_title.toLowerCase();
      const cText = clause.original_text.toLowerCase();

      if (['terminat', 'fire', 'cancel', 'quit', 'leave', 'end'].some((w) => queryLower.includes(w))) {
        if (cTitle.includes('terminat') || cText.includes('terminat')) {
          const isSevere = cText.includes('forfeit') || cText.includes('without notice') || clause.risk_level === 'CRITICAL';
          return {
            scenario_query: req.scenario_query,
            verdict_badge: isSevere ? 'SEVERE_PENALTY' : 'AT_RISK',
            direct_consequence: `Under the '${clause.clause_title}', the counterparty can terminate immediately. ${clause.plain_english}`,
            governing_clause_title: clause.clause_title,
            governing_clause_quote: clause.original_text.substring(0, 220) + (clause.original_text.length > 220 ? '...' : ''),
            recommended_action: 'Negotiate a minimum 14-to-30-day written notice requirement and ensure compensation for all completed work is guaranteed.',
          };
        }
      }

      if (['intellectual', 'ip', 'side project', 'weekend', 'personal', 'inventions'].some((w) => queryLower.includes(w))) {
        if (cTitle.includes('intellectual') || cTitle.includes('ip') || cText.includes('inventions')) {
          return {
            scenario_query: req.scenario_query,
            verdict_badge: 'SEVERE_PENALTY',
            direct_consequence: `According to the '${clause.clause_title}', the company claims ownership over developments. ${clause.plain_english}`,
            governing_clause_title: clause.clause_title,
            governing_clause_quote: clause.original_text.substring(0, 220) + (clause.original_text.length > 220 ? '...' : ''),
            recommended_action: 'Explicitly carve out pre-existing IP and personal projects developed during off-hours without company resources.',
          };
        }
      }

      if (['sued', 'lawsuit', 'liability', 'indemnif', 'damages'].some((w) => queryLower.includes(w))) {
        if (cTitle.includes('indemnif') || cText.includes('liabilit') || cTitle.includes('liabilit')) {
          return {
            scenario_query: req.scenario_query,
            verdict_badge: 'SEVERE_PENALTY',
            direct_consequence: `Under the '${clause.clause_title}', you bear unilateral, potentially uncapped indemnification obligations. ${clause.plain_english}`,
            governing_clause_title: clause.clause_title,
            governing_clause_quote: clause.original_text.substring(0, 220) + (clause.original_text.length > 220 ? '...' : ''),
            recommended_action: 'Cap liability to the total fees received and exclude indemnification for company negligence or willful misconduct.',
          };
        }
      }

      if (['pay', 'late', 'invoice', 'money', 'compensation', 'fee'].some((w) => queryLower.includes(w))) {
        if (cTitle.includes('compensation') || cTitle.includes('pay') || cText.includes('compensation')) {
          return {
            scenario_query: req.scenario_query,
            verdict_badge: clause.risk_level === 'CRITICAL' ? 'SEVERE_PENALTY' : 'AT_RISK',
            direct_consequence: `Regarding fees, the '${clause.clause_title}' governs payout terms. ${clause.plain_english}`,
            governing_clause_title: clause.clause_title,
            governing_clause_quote: clause.original_text.substring(0, 220) + (clause.original_text.length > 220 ? '...' : ''),
            recommended_action: 'Establish net 15 or 30 payment milestones with late fee interest and right to pause work upon overdue payment.',
          };
        }
      }
    }

    return {
      scenario_query: req.scenario_query,
      verdict_badge: 'UNADDRESSED',
      direct_consequence: `The current agreement does not contain an explicit clause governing: "${req.scenario_query}". Statutory default commercial law would govern.`,
      governing_clause_title: 'Not Specified in Agreement',
      governing_clause_quote: 'N/A (Contract is silent on this scenario)',
      recommended_action: 'Draft and insert an express contractual clause addressing this scenario before executing the agreement.',
    };
  }
}


