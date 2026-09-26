'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  FileQuestion,
  Loader2,
  Send,
  Copy,
  Check,
  Quote,
  ArrowRight,
  History,
  Lightbulb,
} from 'lucide-react';
import {
  ContractAnalysisResult,
  ScenarioSimulationResponse,
  VerdictBadge,
} from '@/types/contract';
import { simulateScenario } from '@/lib/api';

interface ScenarioSimulatorProps {
  contractData: ContractAnalysisResult;
}

const COMMON_SCENARIOS = [
  {
    label: 'Immediate Zero-Notice Termination',
    icon: '⚡',
    query: 'What happens if the client terminates the contract immediately without any advance notice?',
  },
  {
    label: 'Personal Weekend Side Projects',
    icon: '💻',
    query: 'What happens if I build an independent personal software project on weekends at home?',
  },
  {
    label: 'Client Sued by Third Party',
    icon: '⚖️',
    query: 'What happens if a third party sues the client claiming damages related to my services?',
  },
  {
    label: 'Client Delays or Withholds Pay',
    icon: '💵',
    query: 'What happens if the client refuses or delays paying my monthly invoices?',
  },
  {
    label: 'Contractor Early Exit / Quitting',
    icon: '🚪',
    query: 'What happens if I need to terminate this contract early due to personal circumstances?',
  },
];

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({ contractData }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScenarioSimulationResponse | null>(null);
  const [history, setHistory] = useState<ScenarioSimulationResponse[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSimulate = async (scenarioText: string) => {
    const trimmed = scenarioText.trim();
    if (!trimmed || isLoading) return;

    setQuery(trimmed);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await simulateScenario({
        scenario_query: trimmed,
        contract_data: contractData,
      });

      setCurrentResult(response);
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.scenario_query !== response.scenario_query);
        return [response, ...filtered].slice(0, 5);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to simulate scenario.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResult = async () => {
    if (!currentResult) return;
    const textToCopy = `[LegalDoc.AI - What-If Scenario Simulation]
Scenario: ${currentResult.scenario_query}
Verdict: ${currentResult.verdict_badge}
Consequence: ${currentResult.direct_consequence}
Governing Clause: ${currentResult.governing_clause_title}
Quote: "${currentResult.governing_clause_quote}"
Recommended Action: ${currentResult.recommended_action}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getVerdictConfig = (verdict: VerdictBadge) => {
    switch (verdict) {
      case 'SEVERE_PENALTY':
        return {
          label: 'SEVERE CONTRACTUAL PENALTY',
          sublabel: 'Predatory or punitive risk identified',
          icon: ShieldAlert,
          cardBorder: 'border-rose-500/50',
          cardBg: 'bg-rose-950/20',
          badgeClasses: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500',
        };
      case 'AT_RISK':
        return {
          label: 'SIGNIFICANT EXPOSURE / AT RISK',
          sublabel: 'Unfavorable or asymmetric terms',
          icon: AlertTriangle,
          cardBorder: 'border-amber-500/50',
          cardBg: 'bg-amber-950/20',
          badgeClasses: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-500',
        };
      case 'SAFE':
        return {
          label: 'PROTECTED / MUTUAL TERMS',
          sublabel: 'Standard or balanced contractual protection',
          icon: ShieldCheck,
          cardBorder: 'border-emerald-500/50',
          cardBg: 'bg-emerald-950/20',
          badgeClasses: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-500',
        };
      case 'UNADDRESSED':
      default:
        return {
          label: 'UNADDRESSED IN CONTRACT',
          sublabel: 'Contract is silent; default statutory law applies',
          icon: FileQuestion,
          cardBorder: 'border-cyan-500/40',
          cardBg: 'bg-cyan-950/20',
          badgeClasses: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-400',
        };
    }
  };

  return (
    <section
      aria-labelledby="scenario-simulator-title"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/85 p-6 backdrop-blur-xl shadow-xl shadow-black/25 space-y-6"
    >
      {/* Decorative Glow */}
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="scenario-simulator-title" className="text-lg font-bold text-white tracking-tight">
                The &ldquo;What If?&rdquo; Scenario Simulator
              </h3>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                Feature 3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ask freeform hypothetical questions to simulate real-world consequences grounded in this contract
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 self-end sm:self-auto">
            <History className="h-3.5 w-3.5 text-indigo-400" />
            <span>{history.length} scenario{history.length > 1 ? 's' : ''} tested</span>
          </div>
        )}
      </div>

      {/* Preset Scenario Chips */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
          <span>Quick Scenario Prompts</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_SCENARIOS.map((scenario, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSimulate(scenario.query)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-indigo-500/50 hover:bg-slate-850 hover:text-white transition shadow-sm disabled:opacity-50"
            >
              <span>{scenario.icon}</span>
              <span>{scenario.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Freeform Query Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSimulate(query);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask any scenario: e.g. What happens if I miss a deliverable milestone by 5 days?"
            aria-label="Hypothetical scenario question"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none pr-10 shadow-inner"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          aria-label="Simulate scenario"
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Simulate</span>
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Simulation Result Card */}
      {currentResult && (
        <div
          role="region"
          aria-live="polite"
          aria-label="Scenario Simulation Result"
          className={`rounded-2xl border ${getVerdictConfig(currentResult.verdict_badge).cardBorder} ${getVerdictConfig(currentResult.verdict_badge).cardBg} p-5 space-y-4 transition-all duration-300`}
        >
          {/* Verdict Banner Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Simulation Scenario
              </span>
              <p className="text-sm font-bold text-white">
                &ldquo;{currentResult.scenario_query}&rdquo;
              </p>
            </div>

            {/* Verdict Badge */}
            {(() => {
              const config = getVerdictConfig(currentResult.verdict_badge);
              const BadgeIcon = config.icon;
              return (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold tracking-wider ${config.badgeClasses}`}
                >
                  <span className={`h-2 w-2 rounded-full ${config.dot} animate-pulse`} />
                  <BadgeIcon className="h-3.5 w-3.5" />
                  <span>{config.label}</span>
                </div>
              );
            })()}
          </div>

          {/* 1. Direct Real-World Consequence */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
              <span>Direct Real-World Consequence (Plain English)</span>
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-200">
              {currentResult.direct_consequence}
            </p>
          </div>

          {/* 2. Direct Clause Citation & Quote */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                <Quote className="h-3.5 w-3.5 text-indigo-400" />
                <span>Governing Clause Citation</span>
              </div>
              <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-300">
                {currentResult.governing_clause_title}
              </span>
            </div>
            <blockquote className="rounded-lg border-l-2 border-indigo-500 bg-slate-900/60 p-3 font-mono text-xs leading-relaxed text-slate-300 italic whitespace-pre-wrap">
              &ldquo;{currentResult.governing_clause_quote}&rdquo;
            </blockquote>
          </div>

          {/* 3. Recommended Action */}
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
              <span>Recommended Protective Action</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-emerald-200/90 font-medium">
              {currentResult.recommended_action}
            </p>
          </div>

          {/* Card Footer: Copy Brief */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleCopyResult}
              aria-label="Copy simulation brief to clipboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Brief!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Copy Simulation Brief</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* History Carousel / Quick List */}
      {history.length > 1 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Recently Simulated Questions
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentResult(item)}
                className={`truncate max-w-xs rounded-lg px-2.5 py-1 text-[11px] font-medium transition border ${
                  currentResult?.scenario_query === item.scenario_query
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
                title={item.scenario_query}
              >
                {item.scenario_query}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
