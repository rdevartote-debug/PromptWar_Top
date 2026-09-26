'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  Sparkles,
  X,
  ArrowRight,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';


interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  onLoadSample,
  isLoading,
  errorMessage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const validateAndSetFile = (file: File) => {
    setLocalError(null);
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      setLocalError(`Unsupported file format. Please choose a .pdf, .docx, or .txt file.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > maxSizeBytes) {
      setLocalError(`File exceeds maximum size of 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClearFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartAnalysis = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer backdrop-blur-xl ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-950/40 shadow-2xl shadow-indigo-500/20 scale-[1.01]'
            : selectedFile
            ? 'border-indigo-500/40 bg-slate-900/90 shadow-xl'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80 shadow-xl shadow-black/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        {/* Glow ambient background */}
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <UploadCloud className="h-8 w-8 transition-transform group-hover:scale-110" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-xl font-bold tracking-tight text-white">
                Drag & drop your contract here
              </h3>
              <p className="text-sm text-slate-400">
                Supports <span className="font-semibold text-slate-300">PDF, Word (.docx), or Plain Text (.txt)</span> up to 10MB
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span className="rounded-lg bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition">
                Browse Files
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            {/* Selected File Card */}
            <div className="flex items-center gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 max-w-lg w-full text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                <FileCheck className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs font-medium text-indigo-300/80">
                  {formatFileSize(selectedFile.size)} &bull; Ready for AI analysis
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
                title="Remove file"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Launch Analysis Button */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <span>Run Autonomous Analysis</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleClearFile}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Choose Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {(localError || errorMessage) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <div>
                <span className="font-bold">Upload Error: </span>
                <span>{localError || errorMessage}</span>
              </div>
              {(errorMessage?.includes('FastAPI backend') || errorMessage?.includes('connect')) && (
                <p className="text-[11px] text-slate-400">
                  Tip: Start the backend with <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">npm run dev</code> (runs both frontend & backend concurrently) or <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">npm run dev:backend</code>.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedFile && (
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={isLoading}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLoadSample}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Try Sample</span>
            </button>
          </div>
        </div>
      )}


      {/* Quick-Start Demo Banner */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Want to see how it works instantly?
            </h4>
            <p className="text-xs text-slate-400">
              Load our benchmark test contract with 4 predatory clauses (Zero-notice termination, off-hours IP grab, uncapped liability).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLoadSample}
          disabled={isLoading}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-4 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>Try Sample Predatory Contract</span>
        </button>
      </div>
    </div>
  );
};
