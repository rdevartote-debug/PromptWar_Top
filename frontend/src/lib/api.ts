import { ContractAnalysisResult } from '@/types/contract';

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
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    } else if (analysis.document_title) {
      const safeTitle = analysis.document_title
        .replace(/[^a-zA-Z0-9_-]/g, '_')
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
