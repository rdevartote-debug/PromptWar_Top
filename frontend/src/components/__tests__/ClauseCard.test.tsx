import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ClauseCard } from '../ClauseCard';
import { ClauseAnalysis } from '@/types/contract';

const mockClause: ClauseAnalysis = {
  clause_id: 'clause-1',
  clause_title: 'Indemnification & Liability Cap',
  original_text: 'Provider shall defend, indemnify, and hold harmless Customer without limit.',
  plain_english: 'You are taking on unlimited financial liability if anything goes wrong.',
  risk_level: 'CRITICAL',
  risk_reasoning: 'Unlimited indemnification poses catastrophic liability exposure.',
  suggested_redline: 'Provider liability under this Section shall be capped at fees paid in the prior 12 months.',
  negotiation_tip: 'Propose an aggregate cap tied to 12 months fees paid.',
};

describe('ClauseCard Component', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders clause title, plain explanation, and critical risk badge', () => {
    render(<ClauseCard clause={mockClause} index={1} counterpartyName="Acme Corp" userRole="Vendor" />);

    expect(screen.getByText('Indemnification & Liability Cap')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL RISK')).toBeInTheDocument();
    expect(screen.getByText(mockClause.plain_english)).toBeInTheDocument();
  });

  it('switches tabs to Redline Diff and Original Legalese', () => {
    render(<ClauseCard clause={mockClause} index={1} />);

    // Target the specific tab button
    const tabs = screen.getAllByRole('button');
    const redlineTab = tabs.find((b) => b.textContent?.includes('Redline Diff') && b.textContent?.includes('Track Changes'));
    expect(redlineTab).toBeDefined();
    if (redlineTab) fireEvent.click(redlineTab);

    expect(screen.getByText(/Track-Changes Redline:/i)).toBeInTheDocument();

    // Click Original Legalese tab
    const originalTab = screen.getByRole('button', { name: /Original Legalese/i });
    fireEvent.click(originalTab);
    expect(screen.getByText(new RegExp(mockClause.original_text, 'i'))).toBeInTheDocument();
  });

  it('copies the suggested redline text to clipboard when copy button is clicked', async () => {
    render(<ClauseCard clause={mockClause} index={1} />);

    // Switch to Redline Diff tab to see copy button
    const tabs = screen.getAllByRole('button');
    const redlineTab = tabs.find((b) => b.textContent?.includes('Redline Diff') && b.textContent?.includes('Track Changes'));
    if (redlineTab) fireEvent.click(redlineTab);

    const copyBtn = screen.getByRole('button', { name: /Copy Counter-Proposal/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockClause.suggested_redline);
  });

  it('opens the Negotiation Draft modal when requested', () => {
    render(<ClauseCard clause={mockClause} index={1} counterpartyName="Acme Corp" userRole="Vendor" />);

    const draftBtn = screen.getByRole('button', { name: /Draft Message/i });
    fireEvent.click(draftBtn);

    expect(screen.getByText(/Negotiation Draft Generator/i)).toBeInTheDocument();
  });
});
