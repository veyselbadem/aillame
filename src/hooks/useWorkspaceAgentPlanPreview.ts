'use client';

import { useCallback, useMemo, useState } from 'react';
import { createWorkspaceAgentPlan } from '../core/agent/planning';
import { createWorkspaceAgentPlanPreviewView, type WorkspaceAgentPlanPreviewView } from '../core/agent/planning/plan-preview-presenter';

export function validateWorkspaceAgentPlanGoal(userGoal: string): string | null {
  const trimmed = userGoal.trim();

  if (!trimmed) {
    return 'Lütfen plan önizlemesi için bir hedef girin.';
  }

  if (trimmed.length < 3) {
    return 'Hedef çok kısa; biraz daha açıklayıcı yazın.';
  }

  if (trimmed.length > 400) {
    return 'Hedef çok uzun; daha kısa ve odaklı bir ifade kullanın.';
  }

  return null;
}

export function useWorkspaceAgentPlanPreview(initialGoal = '') {
  const [userGoal, setUserGoal] = useState(initialGoal);
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ReturnType<typeof createWorkspaceAgentPlan> | null>(null);

  const preview = useMemo<WorkspaceAgentPlanPreviewView | null>(() => {
    if (!plan) {
      return null;
    }

    return createWorkspaceAgentPlanPreviewView(plan);
  }, [plan]);

  const createPlan = useCallback(() => {
    const validationMessage = validateWorkspaceAgentPlanGoal(userGoal);
    if (validationMessage) {
      setError(validationMessage);
      setPlan(null);
      return null;
    }

    setIsPlanning(true);
    setError(null);

    try {
      const nextPlan = createWorkspaceAgentPlan({
        mode: 'plan_only',
        userGoal,
        maxSteps: 6,
      });

      setPlan(nextPlan);
      return nextPlan;
    } catch {
      setError('Plan önizlemesi oluşturulamadı.');
      setPlan(null);
      return null;
    } finally {
      setIsPlanning(false);
    }
  }, [userGoal]);

  return {
    userGoal,
    setUserGoal,
    isPlanning,
    error,
    plan,
    preview,
    createPlan,
  };
}