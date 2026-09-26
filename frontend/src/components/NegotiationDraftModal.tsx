'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Mail,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Handshake,
  User,
  Building,
} from 'lucide-react';
import { ClauseAnalysis, NegotiationDraftResponse } from '@/types/contract';
import { generateNegotiationDraft } from '@/lib/api';

interface NegotiationDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  clause: ClauseAnalysis | null;
  defaultCounterparty?: string;
  defaultUserRole?: string;
}

export const NegotiationDraftModal: React.FC<NegotiationDraftModalProps> = ({
  isOpen,
  onClose,
  clause,
  defaultCounterparty = 'Client / Landlord',
  defaultUserRole = 'Contractor / Tenant',
}) => {
  const [channel, setChannel] = useState<'email' | 'chat'>('email');
  const [tone, setTone] = useState<'diplomatic' | 'firm'>('diplomatic');

  const [counterpartyName, setCounterpartyName] = useState(defaultCounterparty);
  const [userRole, setUserRole] = useState(defaultUserRole);

  const [drafts, setDrafts] = useState<NegotiationDraftResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Copy states
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedChat, setCopiedChat] = useState(false);

  // Editable text states (allows the user to fine-tune before copying)
  const [editableEmailDiplomatic, setEditableEmailDiplomatic] = useState('');
  const [editableEmailFirm, setEditableEmailFirm] = useState('');
  const [editableChatDiplomatic, setEditableChatDiplomatic] = useState('');
  const [editableChatFirm, setEditableChatFirm] = useState('');
  const [editableSubject, setEditableSubject] = useState('');

  // Sync default party names when clause changes
  const [prevClauseId, setPrevClauseId] = useState<string | null>(null);
  if (clause && clause.clause_id !== prevClauseId) {
    setPrevClauseId(clause.clause_id);
    if (defaultCounterparty) setCounterpartyName(defaultCounterparty);
    if (defaultUserRole) setUserRole(defaultUserRole);
  }

  const handleGenerateDrafts = useCallback(async () => {
    if (!clause) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await generateNegotiationDraft({
        clause_title: clause.clause_title,
        original_text: clause.original_text,
        suggested_redline: clause.suggested_redline,
        counterparty_name: counterpartyName.trim() || 'Client / Landlord',
        user_role: userRole.trim() || 'Contractor / Tenant',
      });

      setDrafts(response);
      setEditableSubject(response.email_subject);
      setEditableEmailDiplomatic(response.email_diplomatic);
      setEditableEmailFirm(response.email_firm);
      setEditableChatDiplomatic(response.chat_diplomatic);
      setEditableChatFirm(response.chat_firm);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate negotiation draft.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [clause, counterpartyName, userRole]);

  // Generate drafts whenever modal opens for a clause
  useEffect(() => {
    if (isOpen && clause) {
      const timer = setTimeout(() => {
        handleGenerateDrafts();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, clause, handleGenerateDrafts]);

  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  // Focus trap and keyboard ESC handler
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Auto-focus first focusable element inside modal
    const focusTimer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button, input, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  const handleCopy = async (text: string, type: 'subject' | 'body' | 'chat') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else if (type === 'body') {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      } else if (type === 'chat') {
        setCopiedChat(true);
        setTimeout(() => setCopiedChat(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  // Open native email client
  const handleOpenEmail = () => {
    const activeBody = tone === 'diplomatic' ? editableEmailDiplomatic : editableEmailFirm;
    const subject = encodeURIComponent(editableSubject);
    const body = encodeURIComponent(activeBody);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // Open WhatsApp Web with prefilled message
  const handleOpenWhatsApp = () => {
    const activeChat = tone === 'diplomatic' ? editableChatDiplomatic : editableChatFirm;
    const text = encodeURIComponent(activeChat);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!isOpen || !clause) return null;

  const currentEmailContent = tone === 'diplomatic' ? editableEmailDiplomatic : editableEmailFirm;
  const currentChatContent = tone === 'diplomatic' ? editableChatDiplomatic : editableChatFirm;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="draft-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Negotiation Draft Generator
                </h3>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  AI Copilot
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ready-to-send email & chat drafts proposing a balanced redline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Close modal"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target Clause Overview Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Target Clause: {clause.clause_title}
              </span>
              <span className="font-mono text-[11px] text-slate-500">{clause.clause_id}</span>
            </div>
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-emerald-400">Proposed Redline: </span>
              <span className="font-mono text-[11px] text-emerald-300/90">&ldquo;{clause.suggested_redline}&rdquo;</span>
            </div>
          </div>

          {/* Context Controls: Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <Building className="h-3 w-3 text-slate-500" />
                Recipient / Counterparty
              </label>
              <input
                type="text"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="e.g. Apex Global Enterprises or Landlord"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <User className="h-3 w-3 text-slate-500" />
                Your Role / Sender
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="e.g. Independent Contractor or Tenant"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={handleGenerateDrafts}
                  disabled={isLoading}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
                  title="Re-generate with updated names"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Regen</span>
                </button>
              </div>
            </div>
          </div>

          {/* Channel (Email vs Chat) & Tone (Diplomatic vs Firm) Switches */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            {/* Channel Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setChannel('email')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  channel === 'email'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email Draft</span>
              </button>
              <button
                onClick={() => setChannel('chat')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  channel === 'chat'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>WhatsApp / Slack</span>
              </button>
            </div>

            {/* Tone Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setTone('diplomatic')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  tone === 'diplomatic'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Polite, collaborative tone that preserves relationship"
              >
                <Handshake className="h-3.5 w-3.5 text-emerald-400" />
                <span>Diplomatic</span>
              </button>
              <button
                onClick={() => setTone('firm')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  tone === 'firm'
                    ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Assertive, principled stance stating terms must change"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span>Firm</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs text-slate-400 font-medium">
                Drafting professional negotiation responses via AI...
              </p>
            </div>
          )}

          {/* Error Message */}
          {!isLoading && errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              <p className="font-semibold">{errorMessage}</p>
              <button
                onClick={handleGenerateDrafts}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1 text-white hover:bg-rose-500"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Content Display: EMAIL */}
          {!isLoading && drafts && channel === 'email' && (
            <div className="space-y-4">
              {/* Subject Line */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>SUBJECT LINE</span>
                  <button
                    onClick={() => handleCopy(editableSubject, 'subject')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {copiedSubject ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Subject</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={editableSubject}
                  onChange={(e) => setEditableSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>EMAIL BODY</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      (Tone: {tone === 'diplomatic' ? '🤝 Diplomatic & Collaborative' : '🛡️ Firm & Assertive'})
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(currentEmailContent, 'body')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {copiedBody ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied Email!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={currentEmailContent}
                  onChange={(e) => {
                    if (tone === 'diplomatic') {
                      setEditableEmailDiplomatic(e.target.value);
                    } else {
                      setEditableEmailFirm(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 font-sans text-xs leading-relaxed text-slate-200 focus:border-indigo-500 focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* Content Display: CHAT (WhatsApp / Slack) */}
          {!isLoading && drafts && channel === 'chat' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <span>CHAT MESSAGE (WHATSAPP / SLACK)</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    ({tone === 'diplomatic' ? 'Diplomatic & Friendly' : 'Firm & Direct'})
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(currentChatContent, 'chat')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                >
                  {copiedChat ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied Message!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Bubble Simulation */}
              <div className="rounded-xl border border-emerald-950/60 bg-gradient-to-b from-slate-950 to-slate-900/90 p-4">
                <div className="max-w-md rounded-2xl rounded-tl-sm bg-emerald-950/40 border border-emerald-500/30 p-3.5 shadow-md">
                  <div className="text-[10px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>WhatsApp / Slack Format</span>
                  </div>
                  <textarea
                    rows={5}
                    value={currentChatContent}
                    onChange={(e) => {
                      if (tone === 'diplomatic') {
                        setEditableChatDiplomatic(e.target.value);
                      } else {
                        setEditableChatFirm(e.target.value);
                      }
                    }}
                    className="w-full bg-transparent text-xs leading-relaxed text-slate-200 focus:outline-none resize-none"
                  />
                  <div className="text-[10px] text-right text-emerald-500/70 mt-1 font-mono">
                    Ready to send
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/80 px-6 py-3.5">
          <div className="text-xs text-slate-500">
            Tip: You can edit any text directly before copying or sending.
          </div>

          <div className="flex items-center gap-2">
            {channel === 'email' ? (
              <>
                <button
                  onClick={() => handleCopy(currentEmailContent, 'body')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <Copy className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Copy Body</span>
                </button>
                <button
                  onClick={handleOpenEmail}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Open in Mail App</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleCopy(currentChatContent, 'chat')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition"
                >
                  <Copy className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copy Message</span>
                </button>
                <button
                  onClick={handleOpenWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
