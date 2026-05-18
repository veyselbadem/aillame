"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  WorkspaceAgentExecutionReadinessResult,
} from '../core/agent/execution-readiness/readiness-types';
import { 
  WorkspaceAgentReadinessReviewState,
  WorkspaceAgentPermissionReviewStatus,
  WorkspaceAgentPreflightReviewStatus
} from '../core/agent/execution-readiness/readiness-review-types';
import { 
  createInitialReadinessReviewState,
  updatePermissionReview,
  updatePreflightReview
} from '../core/agent/execution-readiness/readiness-review-state';
import { createReadinessReviewSummary } from '../core/agent/execution-readiness/readiness-review-summary';

export function useWorkspaceAgentReadinessReview(result: WorkspaceAgentExecutionReadinessResult | null) {
  const [reviewState, setReviewState] = useState<WorkspaceAgentReadinessReviewState | null>(null);

  // Initialize review state when result changes
  useEffect(() => {
    if (result) {
      setReviewState(createInitialReadinessReviewState(result));
    } else {
      setReviewState(null);
    }
  }, [result]);

  const handlePermissionReview = useCallback((requirementId: string, status: WorkspaceAgentPermissionReviewStatus, note?: string) => {
    if (!reviewState) return;
    setReviewState(state => state ? updatePermissionReview(state, requirementId, status, note) : null);
  }, [reviewState]);

  const handlePreflightReview = useCallback((checkId: string, status: WorkspaceAgentPreflightReviewStatus, note?: string) => {
    if (!reviewState) return;
    setReviewState(state => state ? updatePreflightReview(state, checkId, status, note) : null);
  }, [reviewState]);

  const reviewSummary = useMemo(() => {
    if (!result || !reviewState) return null;
    return createReadinessReviewSummary(result, reviewState);
  }, [result, reviewState]);

  return {
    reviewState,
    reviewSummary,
    handlePermissionReview,
    handlePreflightReview
  };
}
