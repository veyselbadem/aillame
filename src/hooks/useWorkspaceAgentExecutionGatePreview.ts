import { useState, useCallback } from 'react';
import { evaluateWorkspaceAgentExecutionGate } from '../core/agent/execution-gate/gate-boundary';
import { WorkspaceAgentExecutionGateRequest } from '../core/agent/execution-gate/gate-types';
import { mapGateResultToRenderData, WorkspaceAgentGateRenderData } from '../core/agent/execution-gate/gate-preview-presenter';

export function useWorkspaceAgentExecutionGatePreview() {
  const [requestId, setRequestId] = useState('gate-req-' + Math.random().toString(36).substr(2, 9));
  const [planId, setPlanId] = useState('');
  const [reviewedStepIds, setReviewedStepIds] = useState<string[]>([]);
  const [approvedStepIds, setApprovedStepIds] = useState<string[]>([]);
  const [readinessStatus, setReadinessStatus] = useState('ready_for_future_review');
  const [userVisibleSummary, setUserVisibleSummary] = useState('');
  const [userConfirmationText, setUserConfirmationText] = useState('');
  
  const [renderData, setRenderData] = useState<WorkspaceAgentGateRenderData | null>(null);
  const [rawResult, setRawResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkGate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const request: WorkspaceAgentExecutionGateRequest = {
        requestId,
        planId,
        reviewedStepIds,
        approvedStepIds,
        readinessStatus,
        requestedMode: "gate_check_only",
        userVisibleSummary,
        userConfirmationText
      };

      const result = await evaluateWorkspaceAgentExecutionGate(request);
      setRawResult(result);
      const mappedData = mapGateResultToRenderData(result);
      setRenderData(mappedData);
    } catch (err: any) {
      setError(err.message || 'Gate kontrolü sırasında bir hata oluştu.');
      setRenderData(null);
      setRawResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, planId, reviewedStepIds, approvedStepIds, readinessStatus, userVisibleSummary, userConfirmationText]);

  const reset = useCallback(() => {
    setRenderData(null);
    setRawResult(null);
    setError(null);
    setRequestId('gate-req-' + Math.random().toString(36).substr(2, 9));
  }, []);

  return {
    requestId,
    setRequestId,
    planId,
    setPlanId,
    reviewedStepIds,
    setReviewedStepIds,
    approvedStepIds,
    setApprovedStepIds,
    readinessStatus,
    setReadinessStatus,
    userVisibleSummary,
    setUserVisibleSummary,
    userConfirmationText,
    setUserConfirmationText,
    renderData,
    rawResult,
    isLoading,
    error,
    checkGate,
    reset
  };
}
