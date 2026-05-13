import { useState, useCallback, useEffect, useMemo } from 'react';
import { WorkspaceAgentExecutionGateResult } from '../core/agent/execution-gate/gate-types';
import { WorkspaceAgentExecutionGateReviewState } from '../core/agent/execution-gate/gate-review-types';
import { WorkspaceAgentGateReviewSummary } from '../core/agent/execution-gate/gate-review-summary-types';
import { 
  createInitialGateReviewState, 
  updateGateDecisionReview, 
  updateGateCheckReview, 
  updateGateRiskReview 
} from '../core/agent/execution-gate/gate-review-state';
import { createGateReviewSummary } from '../core/agent/execution-gate/gate-review-summary';

export function useWorkspaceAgentGateReview(gateResult: WorkspaceAgentExecutionGateResult | null) {
  const [reviewState, setReviewState] = useState<WorkspaceAgentExecutionGateReviewState | null>(null);

  // Initialize review state when gate result changes
  useEffect(() => {
    if (gateResult) {
      setReviewState(createInitialGateReviewState(gateResult));
    } else {
      setReviewState(null);
    }
  }, [gateResult]);

  const updateDecision = useCallback((status: any, note?: string) => {
    if (!reviewState) return;
    setReviewState(updateGateDecisionReview(reviewState, status, note));
  }, [reviewState]);

  const updateCheck = useCallback((checkId: string, status: any, note?: string) => {
    if (!reviewState) return;
    setReviewState(updateGateCheckReview(reviewState, checkId, status, note));
  }, [reviewState]);

  const updateRisk = useCallback((riskId: string, status: any, note?: string) => {
    if (!reviewState) return;
    setReviewState(updateGateRiskReview(reviewState, riskId, status, note));
  }, [reviewState]);

  // Generate summary
  const summary = useMemo<WorkspaceAgentGateReviewSummary | null>(() => {
    if (!gateResult || !reviewState) return null;
    return createGateReviewSummary(gateResult, reviewState);
  }, [gateResult, reviewState]);

  return {
    reviewState,
    updateDecision,
    updateCheck,
    updateRisk,
    summary
  };
}
