'use client';

import React, { useEffect, useState } from 'react';
import { Scale, Sparkles, CheckCircle2, Loader2, ShieldCheck, FileSearch, RefreshCw } from 'lucide-react';

const STAGES = [
  {
    title: 'Document Ingestion',
    desc: 'Parsing document structure & extracting legal clauses...',
    icon: FileSearch,
  },
  {
    title: 'Predatory Risk Scan',
    desc: 'Evaluating liability caps, termination traps & indemnification...',
    icon: ShieldCheck,
  },
  {
    title: 'Plain-English Translation',
    desc: 'Translating complex legalese into 8th-grade clear English...',
    icon: Sparkles,
  },
  {
    title: 'Strategy & Redlines',
    desc: 'Generating balanced counter-proposals & attorney prep brief...',
    icon: Scale,
  },
];

interface AnalysisLoaderProps {
  fileName?: string;
}

export const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({ fileName }) => {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.min(100, Math.round(((currentStage + 1) / STAGES.length) * 90) + 5);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl shadow-indigo-950/50 text-center max-w-2xl mx-auto">
      {/* Background glow effects */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

      {/* Main Spinner & Icon */}
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        {/* Outer pulsating rings */}
        <div className="absolute inset-0 rounded-full border border-indigo-500/40 animate-ping opacity-25" />
        <div className="absolute inset-2 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-xl shadow-indigo-500/30">
          <Scale className="h-8 w-8 text-white animate-pulse" />
        </div>
      </div>

      {/* Headline & Current Stage */}
      <div className="mt-6 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
          <span>Gemini 2.5 / 3.6 Flash Inference Pipeline</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Analyzing {fileName ? `"${fileName}"` : 'Contract Document'}
        </h3>

        <p className="text-sm font-medium text-slate-300 transition-all duration-300 min-h-[1.5rem]">
          {STAGES[currentStage].desc}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-8 space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span>Analysis Progress</span>
          <span className="text-indigo-400">{progressPercent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stage Steps List */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;
          const StageIcon = stage.icon;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
                isCurrent
                  ? 'border-indigo-500/50 bg-indigo-950/40 text-white shadow-md shadow-indigo-950/50 scale-[1.02]'
                  : isDone
                  ? 'border-slate-800/80 bg-slate-950/40 text-slate-400'
                  : 'border-slate-800/40 bg-slate-950/20 text-slate-600'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isCurrent ? (
                  <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                ) : (
                  <StageIcon className="h-4 w-4 text-slate-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">
                  {stage.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {isCurrent ? 'Processing now...' : isDone ? 'Complete' : 'Queued'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
