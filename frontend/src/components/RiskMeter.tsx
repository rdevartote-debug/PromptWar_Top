'use client';

import React from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Users, FileText } from 'lucide-react';

interface RiskMeterProps {
  score: number;
  documentTitle: string;
  partiesInvolved: string[];
  riskSummary: string;
  totalClauses: number;
  criticalCount: number;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({
  score,
  documentTitle,
  partiesInvolved,
  riskSummary,
  totalClauses,
  criticalCount,
}) => {
  // Color configuration based on score
  const getRiskDetails = (scoreValue: number) => {
    if (scoreValue > 70) {
      return {
        label: 'Critical / Predatory Risk',
        colorClass: 'text-rose-500',
        bgClass: 'bg-rose-500/10 border-rose-500/30',
        barGradient: 'from-rose-600 via-red-500 to-amber-500',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: ShieldAlert,
        summaryHeadline: 'Predatory Terms Detected — Do Not Sign Without Redlines',
      };
    } else if (scoreValue >= 35) {
      return {
        label: 'Moderate Risk',
        colorClass: 'text-amber-500',
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        barGradient: 'from-amber-500 via-yellow-500 to-emerald-500',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: AlertTriangle,
        summaryHeadline: 'Unbalanced Clauses Found — Review Recommended',
      };
    } else {
      return {
        label: 'Low / Favorable Terms',
        colorClass: 'text-emerald-500',
        bgClass: 'bg-emerald-500/10 border-emerald-500/30',
        barGradient: 'from-emerald-500 to-teal-400',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: ShieldCheck,
        summaryHeadline: 'Standard Balanced Agreement',
      };
    }
  };

  const risk = getRiskDetails(score);
  const RiskIcon = risk.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-xl shadow-2xl shadow-black/40">
      {/* Background glow */}
      <div
        className={`absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
          score > 70 ? 'bg-rose-500' : score >= 35 ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />

      <div className="flex flex-col gap-6">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Contract Evaluation</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {documentTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-slate-400">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-300">Parties:</span>
              {partiesInvolved.map((party, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-md bg-slate-800/80 px-2.5 py-0.5 text-xs font-medium text-slate-200 border border-slate-700/60"
                >
                  {party}
                </span>
              ))}
            </div>
          </div>

          {/* Overall Risk Score Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`flex flex-col items-center justify-center rounded-xl border px-5 py-3 text-center ${risk.bgClass}`}
            >
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold tracking-tight ${risk.colorClass}`}>
                  {score}
                </span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${risk.colorClass}`}>
                {risk.label}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Score Progress Bar with Scale Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <RiskIcon className={`h-4 w-4 ${risk.colorClass}`} />
              Fairness & Risk Score Gauge
            </span>
            <span className="font-semibold text-slate-200">
              {criticalCount} Critical &bull; {totalClauses} Clauses Evaluated
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${risk.barGradient} transition-all duration-1000 ease-out shadow-sm`}
              style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
            />
          </div>

          {/* Gauge Scale Labels */}
          <div className="flex justify-between text-[10px] font-semibold text-slate-500 px-0.5">
            <span className="text-emerald-500">0 (Safe / Fair)</span>
            <span className="text-amber-400">35 (Moderate)</span>
            <span className="text-rose-500">70 (Predatory / Toxic)</span>
            <span className="text-rose-400">100</span>
          </div>
        </div>

        {/* Executive Summary Callout */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 pb-2 text-xs font-bold tracking-wide uppercase text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            Executive AI Assessment
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            {riskSummary}
          </p>
        </div>
      </div>
    </div>
  );
};
