"use client";

import { useState, useCallback, useMemo } from 'react';
import { 
  evaluateWorkspaceAgentExecutionReadiness,
  WorkspaceAgentExecutionReadinessRequest,
  WorkspaceAgentExecutionReadinessResult,
  mapReadinessResultToRenderData,
  WorkspaceAgentReadinessRenderData
} from '../core/agent/execution-readiness';

export function useWorkspaceAgentExecutionReadinessPreview() {
  const [planId, setPlanId] = useState<string>('');
  const [approvedStepIdsText, setApprovedStepIdsText] = useState<string>('');
  const [reviewedStepIdsText, setReviewedStepIdsText] = useState<string>('');
  const [userVisibleSummary, setUserVisibleSummary] = useState<string>('');
  const [userConfirmationText, setUserConfirmationText] = useState<string>('');
  
  const [result, setResult] = useState<WorkspaceAgentExecutionReadinessResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const approvedStepIds = approvedStepIdsText.split(',').map(s => s.trim()).filter(Boolean);
      const reviewedStepIds = reviewedStepIdsText.split(',').map(s => s.trim()).filter(Boolean);

      const request: WorkspaceAgentExecutionReadinessRequest = {
        planId: planId || 'demo_plan',
        approvedStepIds,
        reviewedStepIds,
        requestedMode: "readiness_only",
        userVisibleSummary,
        userConfirmationText
      };

      const evaluationResult = evaluateWorkspaceAgentExecutionReadiness(request);
      setResult(evaluationResult);
    } catch (e: any) {
      setError(e.message || 'Değerlendirme sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, [planId, approvedStepIdsText, reviewedStepIdsText, userVisibleSummary, userConfirmationText]);

  const renderData = useMemo(() => {
    if (!result) return null;
    return mapReadinessResultToRenderData(result);
  }, [result]);

  return {
    inputs: {
      planId,
      setPlanId,
      approvedStepIdsText,
      setApprovedStepIdsText,
      reviewedStepIdsText,
      setReviewedStepIdsText,
      userVisibleSummary,
      setUserVisibleSummary,
      userConfirmationText,
      setUserConfirmationText
    },
    evaluate,
    result,
    renderData,
    isLoading,
    error
  };
}
