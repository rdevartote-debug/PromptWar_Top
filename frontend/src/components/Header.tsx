'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  Sparkles,
  Upload,
  Activity,
  FileDown,
  FileText,
  FileJson,
  ChevronDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ContractAnalysisResult } from '@/types/contract';
import { downloadPdfReport } from '@/lib/api';

interface HeaderProps {
  data: ContractAnalysisResult | null;
  mode: 'sample' | 'live';
  onNewScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({ data, mode, onNewScan }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Raw JSON Download Handler
  const handleDownloadJSON = () => {
    if (!data) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const safeTitle = data.document_title ? data.document_title.toLowerCase().replace(/\s+/g, '_') : 'contract';
    downloadAnchor.setAttribute('download', `${safeTitle}_analysis.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
        <div className="flex items-center gap-2.5">
          {data && (
            <>
              {/* Upload Another Contract */}
              <button
                onClick={onNewScan}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-slate-800 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-400" />
                <span>Upload Another Contract</span>
              </button>

              {/* Professional Download Action Group */}
              <div className="relative" ref={dropdownRef}>
                <div className="inline-flex rounded-xl shadow-sm">
                  {/* Primary PDF Download Button */}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="inline-flex items-center gap-1.5 rounded-l-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm"
                    title="Download Executive PDF Report"
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

                  {/* Dropdown Toggle */}
                  <button
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center rounded-r-xl border-l border-indigo-700 bg-indigo-600 hover:bg-indigo-500 px-2 py-1.5 text-xs font-bold text-white transition"
                    title="Export options"
                    aria-label="More export options"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleDownloadPdf();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600 hover:text-white transition text-left"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Executive PDF Report</div>
                        <div className="text-[10px] text-slate-400">Styled document (.pdf)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleDownloadJSON();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition text-left"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 text-amber-300">
                        <FileJson className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Raw Analysis Data</div>
                        <div className="text-[10px] text-slate-400">Pydantic schema (.json)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
