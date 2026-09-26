'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  Info,
  Lightbulb,
  ShieldAlert,
  ShieldCheck,
  Split,
  FileCode2,
  Sparkles,
  MessageSquare,
  FileDiff,
} from 'lucide-react';
import { ClauseAnalysis, RiskLevel } from '@/types/contract';
import dynamic from 'next/dynamic';
import { computeWordDiff } from '@/lib/diff';

const NegotiationDraftModal = dynamic(
  () => import('./NegotiationDraftModal').then((mod) => mod.NegotiationDraftModal),
  { ssr: false }
);

interface ClauseCardProps {
  clause: ClauseAnalysis;
  index: number;
  counterpartyName?: string;
  userRole?: string;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  index,
  counterpartyName,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<'plain' | 'diff' | 'original' | 'split'>('plain');
  const [diffMode, setDiffMode] = useState<'inline' | 'stacked'>('inline');
  const [copied, setCopied] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  const diffData = useMemo(() => {
    return computeWordDiff(clause.original_text, clause.suggested_redline);
  }, [clause.original_text, clause.suggested_redline]);


  const handleCopyRedline = async () => {
    try {
      await navigator.clipboard.writeText(clause.suggested_redline);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          label: 'CRITICAL RISK',
          icon: ShieldAlert,
          classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
        };
      case 'HIGH':
        return {
          label: 'HIGH RISK',
          icon: AlertTriangle,
          classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
        };
      case 'MEDIUM':
        return {
          label: 'MEDIUM RISK',
          icon: AlertCircle,
          classes: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
          dot: 'bg-yellow-400',
        };
      case 'LOW':
      default:
        return {
          label: 'LOW RISK',
          icon: ShieldCheck,
          classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
    }
  };

  const badge = getRiskBadge(clause.risk_level);
  const BadgeIcon = badge.icon;

  return (
    <article
      tabIndex={0}
      aria-labelledby={`clause-title-${clause.clause_id}`}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md transition-all duration-200 hover:border-slate-700/90 shadow-xl shadow-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    >
      {/* Top Header: Title, ID & Risk Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-400">
              {index}
            </span>
            <span className="font-mono text-xs text-slate-500">{clause.clause_id}</span>
          </div>
          <h3 id={`clause-title-${clause.clause_id}`} className="text-lg font-bold text-white tracking-tight">
            {clause.clause_title}
          </h3>
        </div>

        {/* Risk Badge */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wider ${badge.classes}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot} animate-pulse`} />
          <BadgeIcon className="h-3.5 w-3.5" />
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Tab Controls: Plain English vs Redline Diff vs Original Legalese vs Split */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800/80">
            <button
              onClick={() => setActiveTab('plain')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'plain'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Plain Explanation (8th Grade)
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'diff'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileDiff className="h-3.5 w-3.5 text-emerald-400" />
              <span>Redline Diff</span>
              <span className="hidden sm:inline-block rounded bg-indigo-950/80 px-1 py-0.2 text-[10px] text-indigo-300">
                Track Changes
              </span>
            </button>
            <button
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'original'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              Original Legalese
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`hidden sm:flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'split'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              Side-by-Side
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="mt-3">
          {activeTab === 'plain' && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                What this actually means for you:
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-200">
                {clause.plain_english}
              </p>
            </div>
          )}

          {activeTab === 'diff' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3">
              {/* Redline Diff Header & Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileDiff className="h-3.5 w-3.5 text-emerald-400" />
                    Track-Changes Redline:
                  </span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <del className="line-through decoration-rose-500 font-mono">Struck-through Deleted</del>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <ins className="no-underline underline decoration-emerald-500 font-mono font-medium">Counter-Proposal</ins>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Diff Mode Toggle: Inline vs Stacked */}
                  <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                    <button
                      onClick={() => setDiffMode('inline')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        diffMode === 'inline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Inline Diff
                    </button>
                    <button
                      onClick={() => setDiffMode('stacked')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        diffMode === 'stacked' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Before / After
                    </button>
                  </div>

                  {/* Diff Stats Badge */}
                  <span className="rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    -{diffData.stats.removedCount} / +{diffData.stats.addedCount} words
                  </span>
                </div>
              </div>

              {/* Inline Diff Mode */}
              {diffMode === 'inline' && (
                <div className="rounded-lg bg-slate-900/60 border border-slate-800/70 p-3.5 leading-relaxed font-mono text-xs whitespace-pre-wrap select-text">
                  {diffData.chunks.map((chunk, idx) => {
                    if (chunk.type === 'removed') {
                      return (
                        <del
                          key={idx}
                          className="bg-rose-500/20 text-rose-300 line-through decoration-rose-500/90 px-1 py-0.5 rounded font-mono font-medium mx-0.5 select-text"
                          title="Deleted original term"
                        >
                          {chunk.value}
                        </del>
                      );
                    }
                    if (chunk.type === 'added') {
                      return (
                        <ins
                          key={idx}
                          className="bg-emerald-500/20 text-emerald-300 no-underline underline decoration-emerald-500 font-mono font-semibold px-1 py-0.5 rounded mx-0.5 select-text"
                          title="Proposed counter-proposal"
                        >
                          {chunk.value}
                        </ins>
                      );
                    }
                    return (
                      <span key={idx} className="text-slate-300 font-mono select-text">
                        {chunk.value}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Stacked Before / After Mode */}
              {diffMode === 'stacked' && (
                <div className="space-y-2.5">
                  <div className="rounded-lg bg-rose-950/20 border border-rose-900/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Original Clause (To be Replaced / Struck Out):
                    </div>
                    <p className="font-mono text-xs text-rose-300/90 line-through decoration-rose-500/60 leading-relaxed whitespace-pre-wrap">
                      {clause.original_text}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Amended Counter-Proposal (Proposed Replacement):
                    </div>
                    <p className="font-mono text-xs text-emerald-300 leading-relaxed underline decoration-emerald-500/60 whitespace-pre-wrap font-medium">
                      {clause.suggested_redline}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'original' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                <FileCode2 className="h-3.5 w-3.5" />
                Contract clause text:
              </div>
              <p className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                &ldquo;{clause.original_text}&rdquo;
              </p>
            </div>
          )}

          {activeTab === 'split' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Original Legalese
                </div>
                <p className="font-mono text-xs leading-relaxed text-slate-300">
                  &ldquo;{clause.original_text}&rdquo;
                </p>
              </div>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Plain Language Explanation
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-200">
                  {clause.plain_english}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Why This Matters Callout */}
      <div className="mt-4 rounded-xl border border-rose-950/50 bg-rose-950/10 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 pb-1">
          <Info className="h-4 w-4 text-rose-400" />
          Why This Matters & Risk Impact
        </div>
        <p className="text-xs leading-relaxed text-slate-300">
          {clause.risk_reasoning}
        </p>
      </div>

      {/* Suggested Redline (Fair Counter-Proposal) */}
      <div className="mt-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            Suggested Redline (Balanced Counter-Proposal)
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('diff')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 px-3 py-1 text-xs font-semibold text-indigo-300 hover:text-white transition-all shadow-sm"
              title="View visual Redline Diff with struck-through deleted terms and highlighted counter-proposals"
            >
              <FileDiff className="h-3.5 w-3.5 text-indigo-400" />
              <span>View Redline Diff</span>
            </button>
            <button
              onClick={() => setIsDraftModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-xs font-semibold text-white transition-all shadow-sm"
              title="Draft ready-to-send negotiation email or WhatsApp message"
            >
              <MessageSquare className="h-3.5 w-3.5 text-indigo-200" />
              <span>Draft Message</span>
            </button>
            <button
              onClick={handleCopyRedline}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700 border border-emerald-800/50'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span>Copied Redline!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copy Counter-Proposal</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3">
          <p className="font-mono text-xs leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
            {clause.suggested_redline}
          </p>
        </div>
      </div>

      {/* Negotiation Tip Callout */}
      <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-900/30 bg-amber-950/10 px-4 py-3 text-xs text-amber-200/90">
        <Lightbulb className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300">Negotiation Strategy: </span>
          <span>{clause.negotiation_tip}</span>
        </div>
      </div>

      {/* Negotiation Draft Modal */}
      <NegotiationDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        clause={clause}
        defaultCounterparty={counterpartyName}
        defaultUserRole={userRole}
      />
    </article>
  );
};

