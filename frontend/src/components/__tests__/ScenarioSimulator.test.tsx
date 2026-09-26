import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScenarioSimulator } from '../ScenarioSimulator';
import { ContractAnalysisResult, ScenarioSimulationResponse } from '@/types/contract';
import * as api from '@/lib/api';

jest.mock('@/lib/api');

const mockContractData: ContractAnalysisResult = {
  document_title: 'Master Services Agreement',
  parties_involved: ['Alpha LLC', 'Beta Inc'],
  overall_risk_score: 72,
  risk_summary: 'High liability risk with strict confidentiality covenants.',
  clauses: [
    {
      clause_id: 'cl-1',
      clause_title: 'Termination for Convenience',
      original_text: 'Either party may terminate upon 30 days written notice.',
      plain_english: 'You or the client can terminate anytime with 30 days notice.',
      risk_level: 'LOW',
      risk_reasoning: 'Standard bilateral termination clause.',
      suggested_redline: 'Either party may terminate upon 30 days written notice with accrued payment.',
      negotiation_tip: 'Ensure all completed work must be paid prior to effective termination date.',
    },
  ],
  action_checklist: ['Review indemnity section', 'Confirm insurance coverage'],
  attorney_prep_questions: ['Does the client require mutual non-solicitation?'],
};

const mockSimulationResponse: ScenarioSimulationResponse = {
  scenario_query: 'What happens if the client terminates the contract immediately without any advance notice?',
  verdict_badge: 'AT_RISK',
  direct_consequence: 'Immediate termination without 30 days notice breaches Section 4.',
  governing_clause_title: 'Termination for Convenience',
  governing_clause_quote: 'Either party may terminate upon 30 days written notice.',
  recommended_action: 'Demand payment for the full 30-day notice period as damages.',
};

describe('ScenarioSimulator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders simulator header, preset scenario chips, and input field', () => {
    render(<ScenarioSimulator contractData={mockContractData} />);

    expect(screen.getByText(/Scenario Simulator/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask any scenario/i)).toBeInTheDocument();
    expect(screen.getByText('Immediate Zero-Notice Termination')).toBeInTheDocument();
  });

  it('populates input field and fires simulation when a preset chip is clicked', async () => {
    (api.simulateScenario as jest.Mock).mockResolvedValueOnce(mockSimulationResponse);

    render(<ScenarioSimulator contractData={mockContractData} />);

    const chip = screen.getByText('Immediate Zero-Notice Termination');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(api.simulateScenario).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/AT RISK/i)).toBeInTheDocument();
    expect(screen.getByText(mockSimulationResponse.direct_consequence)).toBeInTheDocument();
    expect(screen.getByText(mockSimulationResponse.recommended_action)).toBeInTheDocument();
  });

  it('handles custom user input submission', async () => {
    (api.simulateScenario as jest.Mock).mockResolvedValueOnce(mockSimulationResponse);

    render(<ScenarioSimulator contractData={mockContractData} />);

    const input = screen.getByPlaceholderText(/Ask any scenario/i);
    const submitBtn = screen.getByRole('button', { name: /Simulate/i });

    fireEvent.change(input, { target: { value: 'What if they do not pay?' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.simulateScenario).toHaveBeenCalledWith({
        scenario_query: 'What if they do not pay?',
        contract_data: mockContractData,
      });
    });
  });

  it('displays error message if simulation fails', async () => {
    (api.simulateScenario as jest.Mock).mockRejectedValueOnce(new Error('Backend timeout'));

    render(<ScenarioSimulator contractData={mockContractData} />);

    const input = screen.getByPlaceholderText(/Ask any scenario/i);
    const submitBtn = screen.getByRole('button', { name: /Simulate/i });

    fireEvent.change(input, { target: { value: 'What if client goes bankrupt?' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Backend timeout/i)).toBeInTheDocument();
  });
});
