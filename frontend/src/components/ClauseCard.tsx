'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { ClauseAnalysis, RiskLevel } from '@/types/contract';

interface ClauseCardProps {
  clause: ClauseAnalysis;
  index: number;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({ clause, index }) => {
  const [activeTab, setActiveTab] = useState<'plain' | 'original' | 'split'>('plain');
  const [copied, setCopied] = useState(false);

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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md transition-all duration-200 hover:border-slate-700/90 shadow-xl shadow-black/20">
      {/* Top Header: Title, ID & Risk Badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-400">
              {index}
            </span>
            <span className="font-mono text-xs text-slate-500">{clause.clause_id}</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
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

      {/* Tab Controls: Plain English vs Original Legalese vs Split */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1 border border-slate-800/80">
            <button
              onClick={() => setActiveTab('plain')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'plain'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Plain-English (8th Grade)
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
                  Plain-English Translation
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
    </div>
  );
};
