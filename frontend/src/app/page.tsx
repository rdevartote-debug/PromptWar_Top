'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import initialMockData from '@/data/mockData.json';
import { ContractAnalysisResult, RiskLevel } from '@/types/contract';
import { analyzeContract } from '@/lib/api';
import { Header } from '@/components/Header';
import { RiskMeter } from '@/components/RiskMeter';
import { ClauseCard } from '@/components/ClauseCard';
import { ActionSidebar } from '@/components/ActionSidebar';
import { FileUploadZone } from '@/components/FileUploadZone';
import { AnalysisLoader } from '@/components/AnalysisLoader';
import { LegalDisclaimerBanner } from '@/components/LegalDisclaimerBanner';

// Lazy-load heavy ScenarioSimulator component
const ScenarioSimulator = dynamic(
  () => import('@/components/ScenarioSimulator').then((mod) => mod.ScenarioSimulator),
  { ssr: false }
);

import {
  Filter,
  Layers,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Scale,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

export default function DashboardPage() {
  const [contractData, setContractData] = useState<ContractAnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'sample' | 'live'>('sample');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | RiskLevel>('ALL');

  // Load sample predatory contract immediately
  const handleLoadSample = useCallback(() => {
    setErrorMessage(null);
    setAnalysisMode('sample');
    setContractData(initialMockData as ContractAnalysisResult);
    setCurrentFileName('Sample_Predatory_Contract.txt');
  }, []);

  // Upload and analyze real document with FastAPI + Gemini
  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setCurrentFileName(file.name);
    setErrorMessage(null);

    try {
      const result = await analyzeContract(file);
      setContractData(result);
      setAnalysisMode('live');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Return to upload screen
  const handleNewScan = useCallback(() => {
    setContractData(null);
    setErrorMessage(null);
    setCurrentFileName('');
  }, []);

  // Clause count breakdown
  const counts = useMemo(() => {
    if (!contractData) return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const total = contractData.clauses.length;
    const critical = contractData.clauses.filter((c) => c.risk_level === 'CRITICAL').length;
    const high = contractData.clauses.filter((c) => c.risk_level === 'HIGH').length;
    const medium = contractData.clauses.filter((c) => c.risk_level === 'MEDIUM').length;
    const low = contractData.clauses.filter((c) => c.risk_level === 'LOW').length;
    return { total, critical, high, medium, low };
  }, [contractData]);

  // Filtered clauses
  const filteredClauses = useMemo(() => {
    if (!contractData) return [];
    if (selectedFilter === 'ALL') {
      return contractData.clauses;
    }
    return contractData.clauses.filter((c) => c.risk_level === selectedFilter);
  }, [contractData, selectedFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        data={contractData}
        mode={analysisMode}
        onNewScan={handleNewScan}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center">
        {/* State 1: Active Loading Stage */}
        {isLoading && (
          <div className="py-12">
            <AnalysisLoader fileName={currentFileName} />
          </div>
        )}

        {/* State 2: No Contract Loaded (Upload Prompt) */}
        {!isLoading && !contractData && (
          <section aria-labelledby="hero-title" className="space-y-8 py-6">
            {/* Hero text */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Scale className="h-3.5 w-3.5 text-indigo-400" />
                <span>AI-Powered Legal Risk Engine</span>
              </div>
              <h2 id="hero-title" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Analyze Any Contract in Seconds
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Translate legalese into plain English, uncover unfair liability traps, and generate balanced redlines automatically.
              </p>
            </div>

            {/* File Upload Zone */}
            <FileUploadZone
              onFileSelect={handleFileSelect}
              onLoadSample={handleLoadSample}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          </section>
        )}

        {/* State 3: Contract Results Loaded */}
        {!isLoading && contractData && (
          <section aria-label="Contract Analysis Dashboard" className="space-y-6">
            {/* Mode switch banner if viewing sample */}
            {analysisMode === 'sample' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Viewing Sample Predatory Contract
                    </h4>
                    <p className="text-xs text-slate-400">
                      This is a preloaded benchmark dataset. Upload your own .pdf or .docx file anytime.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleNewScan}
                  aria-label="Upload your own contract document"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Upload Your Own Contract</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* Left Column (65% width -> 8 cols of 12) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* 1. Overall Risk Meter & Summary */}
                <RiskMeter
                  score={contractData.overall_risk_score}
                  documentTitle={contractData.document_title}
                  partiesInvolved={contractData.parties_involved}
                  riskSummary={contractData.risk_summary}
                  totalClauses={counts.total}
                  criticalCount={counts.critical}
                  detectedLanguage={contractData.detected_language}
                />

                {/* 2. Feature 3: The "What If?" Scenario Simulator */}
                <ScenarioSimulator contractData={contractData} />

                {/* 3. Clause Severity Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
                    <Filter className="h-4 w-4 text-indigo-400" />
                    <span>Filter Clauses by Severity</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* ALL */}
                    <button
                      onClick={() => setSelectedFilter('ALL')}
                      aria-label={`Show all ${counts.total} clauses`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        selectedFilter === 'ALL'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      All ({counts.total})
                    </button>

                    {/* CRITICAL */}
                    <button
                      onClick={() => setSelectedFilter('CRITICAL')}
                      aria-label={`Show ${counts.critical} critical risk clauses`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        selectedFilter === 'CRITICAL'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 border border-rose-900/40'
                      }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Critical ({counts.critical})
                    </button>

                    {/* HIGH */}
                    <button
                      onClick={() => setSelectedFilter('HIGH')}
                      aria-label={`Show ${counts.high} high risk clauses`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        selectedFilter === 'HIGH'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-amber-950/30 text-amber-300 hover:bg-amber-900/50 border border-amber-900/40'
                      }`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      High ({counts.high})
                    </button>

                    {/* MEDIUM */}
                    <button
                      onClick={() => setSelectedFilter('MEDIUM')}
                      aria-label={`Show ${counts.medium} medium risk clauses`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        selectedFilter === 'MEDIUM'
                          ? 'bg-yellow-600 text-white shadow-sm'
                          : 'bg-yellow-950/30 text-yellow-300 hover:bg-yellow-900/50 border border-yellow-900/40'
                      }`}
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      Medium ({counts.medium})
                    </button>

                    {/* LOW */}
                    <button
                      onClick={() => setSelectedFilter('LOW')}
                      aria-label={`Show ${counts.low} low risk clauses`}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        selectedFilter === 'LOW'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-900/40'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Low ({counts.low})
                    </button>
                  </div>
                </div>

                {/* 3. Clause Analysis Cards List */}
                <section aria-label="Detailed Clause Cards List" className="flex flex-col gap-5">
                  {filteredClauses.length > 0 ? (
                    filteredClauses.map((clause, idx) => (
                      <ClauseCard
                        key={clause.clause_id}
                        clause={clause}
                        index={idx + 1}
                        counterpartyName={contractData.parties_involved?.[0] || 'Client / Landlord'}
                        userRole={contractData.parties_involved?.[1] || 'Contractor / Tenant'}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
                      <p className="text-sm font-medium text-slate-400">
                        No clauses found matching the selected risk filter ({selectedFilter}).
                      </p>
                      <button
                        onClick={() => setSelectedFilter('ALL')}
                        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                      >
                        Reset Filter
                      </button>
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column (35% width -> 4 cols of 12) */}
              <aside aria-label="Action Checklist and Attorney Brief" className="lg:col-span-4 lg:sticky lg:top-20">
                <ActionSidebar
                  actionChecklist={contractData.action_checklist}
                  attorneyQuestions={contractData.attorney_prep_questions}
                  contractData={contractData}
                />
              </aside>
            </div>
          </section>
        )}
      </main>

      {/* Footer Legal Disclaimer Banner */}
      <footer aria-label="Legal Notice">
        <LegalDisclaimerBanner />
      </footer>
    </div>
  );
}
