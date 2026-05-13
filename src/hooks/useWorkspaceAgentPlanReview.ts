'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkspaceAgentPlan } from '../core/agent/planning/planning-types';
import {
  WorkspaceAgentPlanReviewState,
  WorkspaceAgentPlanStepReviewStatus,
} from '../core/agent/planning/plan-review-types';
import {
  createInitialPlanReviewState,
  updatePlanStepReview,
  getPlanReviewSummary,
} from '../core/agent/planning/plan-review-state';
import { createPlanReviewSummary } from '../core/agent/planning/plan-review-summary';

/**
 * Hook to manage the review state of a workspace agent plan.
 * Provides functions to update step review status and get a summary.
 * No execution or storage persistence is performed.
 */
export function useWorkspaceAgentPlanReview(plan: WorkspaceAgentPlan | null) {
  const [reviewState, setReviewState] = useState<WorkspaceAgentPlanReviewState | null>(null);

  // Initialize or reset review state when plan changes
  useEffect(() => {
    if (plan) {
      // In a real app, plan.summary or a unique ID from plan could be used
      const planId = `plan_${Math.random().toString(36).substring(2, 9)}`;
      setReviewState(createInitialPlanReviewState(plan, planId));
    } else {
      setReviewState(null);
    }
  }, [plan]);

  /**
   * Updates the review status and optional note for a specific step.
   */
  const updateStepReview = useCallback(
    (stepId: string, status: WorkspaceAgentPlanStepReviewStatus, note?: string) => {
      setReviewState((prev) => {
        if (!prev) return null;
        return updatePlanStepReview(prev, stepId, status, note);
      });
    },
    []
  );

  /**
   * Computed summary of the current review state.
   */
  const summary = useMemo(() => {
    if (!reviewState) return null;
    return getPlanReviewSummary(reviewState);
  }, [reviewState]);

  /**
   * Detailed exportable summary.
   */
  const exportedSummary = useMemo(() => {
    if (!plan || !reviewState) return null;
    return createPlanReviewSummary(plan, reviewState);
  }, [plan, reviewState]);

  return {
    reviewState,
    updateStepReview,
    summary,
    exportedSummary,
    isReviewed: reviewState?.status === 'reviewed',
  };
}
