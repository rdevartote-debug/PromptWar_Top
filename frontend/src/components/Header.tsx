'use client';

import React, { useState } from 'react';
import {
  Scale,
  Sparkles,
  Upload,
  Activity,
  FileDown,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { ContractAnalysisResult } from '@/types/contract';
import { downloadPdfReport, downloadDocxRedline } from '@/lib/api';

interface HeaderProps {
  data: ContractAnalysisResult | null;
  mode: 'sample' | 'live';
  onNewScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({ data, mode, onNewScan }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF Report Download Handler
  const handleDownloadPdf = async () => {
    if (!data || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setErrorMessage(null);

    try {
      await downloadPdfReport(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download PDF report.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Word (.docx) Track-Changes Export Handler
  const handleDownloadDocx = async () => {
    if (!data || isDownloadingDocx) return;
    setIsDownloadingDocx(true);
    setErrorMessage(null);

    try {
      await downloadDocxRedline({
        document_title: data.document_title,
        clauses: data.clauses,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export Word (.docx) document.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsDownloadingDocx(false);
    }
  };


  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                LegalDoc<span className="text-indigo-400">.AI</span>
              </h1>

              {/* Mode Badges */}
              {data && (
                mode === 'live' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 animate-pulse">
                    <Activity className="h-3 w-3 text-emerald-400" />
                    Live Analysis Result
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Sample Contract (Preview Mode)
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Contract Risk & Redline Analyzer
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <nav aria-label="Document Actions" className="flex items-center gap-2.5">
          {data && (
            <>
              {/* Upload Another Contract */}
              <button
                onClick={onNewScan}
                aria-label="Upload another contract document"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-slate-800 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-400" />
                <span>Upload Another Contract</span>
              </button>

              {/* Server-Generated PDF Report Download Action */}
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                aria-label="Download Executive PDF Analysis Report"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm"
                title="Download Server-Generated Executive PDF Report"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>

              {/* Server-Generated Word (.docx) Track-Changes Redline Export Action */}
              <button
                onClick={handleDownloadDocx}
                disabled={isDownloadingDocx}
                aria-label="Export Amended Word Document with Track Changes"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600/15 hover:bg-emerald-600/25 disabled:opacity-75 disabled:cursor-not-allowed px-3.5 py-1.5 text-xs font-bold text-emerald-300 hover:text-white transition shadow-sm"
                title="Export Amended Agreement as Word (.docx) with Track-Changes styling"
              >
                {isDownloadingDocx ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    <span>Exporting Word...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Export Word (.docx)</span>
                  </>
                )}
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Temporary Error Toast */}
      {errorMessage && (
        <div className="bg-rose-500/15 border-t border-rose-500/30 px-4 py-2 text-xs text-rose-300 flex items-center justify-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </header>
  );
};
