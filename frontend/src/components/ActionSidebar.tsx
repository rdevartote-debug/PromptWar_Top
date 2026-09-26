'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  Circle,
  ListChecks,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldQuestion,
  FileText,
  FileDown,
  Loader2,
  DownloadCloud,
} from 'lucide-react';
import { ContractAnalysisResult } from '@/types/contract';
import { downloadDocxRedline, downloadPdfReport } from '@/lib/api';

interface ActionSidebarProps {
  actionChecklist: string[];
  attorneyQuestions: string[];
  contractData?: ContractAnalysisResult | null;
}

export const ActionSidebar: React.FC<ActionSidebarProps> = ({
  actionChecklist,
  attorneyQuestions,
  contractData,
}) => {
  // Checkbox state for each action item
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [isAttorneyBriefOpen, setIsAttorneyBriefOpen] = useState(true);
  const [copiedQuestions, setCopiedQuestions] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleDownloadDocx = async () => {
    if (!contractData || isDownloadingDocx) return;
    setIsDownloadingDocx(true);
    setExportError(null);
    try {
      await downloadDocxRedline({
        document_title: contractData.document_title,
        clauses: contractData.clauses,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export Word document.';
      setExportError(msg);
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contractData || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setExportError(null);
    try {
      await downloadPdfReport(contractData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download PDF report.';
      setExportError(msg);
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalChecklist = actionChecklist.length;
  const progressPercent = totalChecklist > 0 ? Math.round((completedCount / totalChecklist) * 100) : 0;

  const handleCopyQuestions = async () => {
    try {
      const formattedText = attorneyQuestions
        .map((q, idx) => `${idx + 1}. ${q}`)
        .join('\n\n');
      await navigator.clipboard.writeText(formattedText);
      setCopiedQuestions(true);
      setTimeout(() => setCopiedQuestions(false), 2000);
    } catch (err) {
      console.error('Failed to copy questions', err);
    }
  };

  const handlePrintBrief = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Pre-Signing Action Checklist */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ListChecks className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Pre-Signing Checklist</h3>
              <p className="text-xs text-slate-400">Critical actions before signature</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-slate-700">
            {completedCount}/{totalChecklist}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-400">
            <span>Readiness Progress</span>
            <span className={progressPercent === 100 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
              {progressPercent}% Done
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : progressPercent > 50
                  ? 'bg-indigo-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Checklist Items */}
        <div className="mt-4 space-y-2.5">
          {actionChecklist.map((item, idx) => {
            const isDone = !!checkedItems[idx];
            return (
              <div
                key={idx}
                onClick={() => toggleCheck(idx)}
                className={`group flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  isDone
                    ? 'border-emerald-900/40 bg-emerald-950/20 text-slate-400'
                    : 'border-slate-800/90 bg-slate-950/60 text-slate-200 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 transition-transform scale-110" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-600 group-hover:text-indigo-400" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium leading-relaxed select-none ${
                    isDone ? 'line-through text-slate-500' : 'text-slate-200'
                  }`}
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Attorney Prep Brief */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-xl shadow-xl shadow-black/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30">
              <ShieldQuestion className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Attorney Prep Brief</h3>
              <p className="text-xs text-slate-400">Targeted questions for legal counsel</p>
            </div>
          </div>
          <button
            onClick={() => setIsAttorneyBriefOpen(!isAttorneyBriefOpen)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            {isAttorneyBriefOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {isAttorneyBriefOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Take these exact questions to your legal consultation to get precise advice quickly:
            </p>

            <div className="space-y-3">
              {attorneyQuestions.map((question, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-3.5 text-xs text-slate-300"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-400">
                      Q{idx + 1}
                    </span>
                    <p className="leading-relaxed font-medium text-slate-200">
                      {question}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleCopyQuestions}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 py-2 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
              >
                {copiedQuestions ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied Brief!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Copy All Questions</span>
                  </>
                )}
              </button>
              <button
                onClick={handlePrintBrief}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 py-2 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                title="Print brief for attorney meeting"
              >
                <Printer className="h-3.5 w-3.5 text-slate-400" />
                <span>Print</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Contract Deliverables & Track-Changes Export */}
      {contractData && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-xl shadow-xl shadow-black/20 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                <DownloadCloud className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Negotiation Deliverables</h3>
                <p className="text-xs text-slate-400">Export redlines & reports</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Generate formal documents with Track-Changes redlining or executive PDF summaries ready for counter-proposals.
          </p>

          <div className="space-y-2.5">
            {/* Word Track-Changes Export Button */}
            <button
              onClick={handleDownloadDocx}
              disabled={isDownloadingDocx}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 hover:text-white py-2.5 px-3 text-xs font-bold transition shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isDownloadingDocx ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Generating Word (.docx)...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span>Export Amended Word (.docx)</span>
                </>
              )}
            </button>

            {/* Executive PDF Report Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white py-2 px-3 text-xs font-semibold transition shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-indigo-400" />
                  <span>Download Executive PDF</span>
                </>
              )}
            </button>
          </div>

          {exportError && (
            <p className="text-[11px] text-rose-400 text-center">{exportError}</p>
          )}
        </div>
      )}
    </div>
  );
};
