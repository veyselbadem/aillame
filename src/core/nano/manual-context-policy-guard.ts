import { detectManualContextAnswerScenario } from "./manual-context-answer-structure";
import { detectManualContextConflicts } from "./manual-context-conflict-policy";
import { detectProfileAwareManualContextStyle } from "./manual-context-profile-style";
import type { NanoProfileType } from "./types";
import { detectManualContextInsufficiency } from "./insufficient-context-policy";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";
import { detectVisibleManualContextReferences } from "./visible-reference-policy";

export type ManualContextPolicyCode =
  | "manual_context_present"
  | "manual_context_absent"
  | "grounded_style_required"
  | "reference_style_required"
  | "insufficiency_detected"
  | "conflict_detected"
  | "ask_for_more_context"
  | "avoid_definitive_claims"
  | "compact_profile_style_required";

export interface ManualContextPolicyGuardResult {
  hasManualContext: boolean;
  hasReferences: boolean;
  hasInsufficiency: boolean;
  hasConflict: boolean;
  profile: NanoProfileType;
  shouldUseGroundedStyle: boolean;
  shouldUseReferenceStyle: boolean;
  shouldAskForMoreContext: boolean;
  shouldAvoidDefinitiveClaims: boolean;
  shouldUseCompactProfileStyle: boolean;
  safePolicyCodes: ManualContextPolicyCode[];
  safeWarnings: string[];
}

export function evaluateManualContextPolicyGuard(
  message: string,
  profile?: NanoProfileType
): ManualContextPolicyGuardResult {
  const normalizedProfile: NanoProfileType = profile ?? "balanced";
  const visibleContext = detectVisibleManualContextInUserMessage(message);
  const hasManualContext = visibleContext.hasVisibleManualContext;

  if (!hasManualContext) {
    return {
      hasManualContext: false,
      hasReferences: false,
      hasInsufficiency: false,
      hasConflict: false,
      profile: normalizedProfile,
      shouldUseGroundedStyle: false,
      shouldUseReferenceStyle: false,
      shouldAskForMoreContext: false,
      shouldAvoidDefinitiveClaims: false,
      shouldUseCompactProfileStyle: false,
      safePolicyCodes: ["manual_context_absent"],
      safeWarnings: [],
    };
  }

  const references = detectVisibleManualContextReferences(message);
  const insufficiency = detectManualContextInsufficiency(message);
  const conflict = detectManualContextConflicts(message);
  const answerScenario = detectManualContextAnswerScenario(message);
  const profileStyle = detectProfileAwareManualContextStyle(message, normalizedProfile);

  const safePolicyCodes: ManualContextPolicyCode[] = [
    "manual_context_present",
    "grounded_style_required",
    "compact_profile_style_required",
  ];

  if (references.hasReferences) {
    safePolicyCodes.push("reference_style_required");
  }
  if (insufficiency.needsMoreContext) {
    safePolicyCodes.push("insufficiency_detected", "ask_for_more_context", "avoid_definitive_claims");
  }
  if (conflict.hasPotentialConflict || conflict.needsClarification) {
    safePolicyCodes.push("conflict_detected", "ask_for_more_context", "avoid_definitive_claims");
  }

  const safeWarnings: string[] = [];
  if (visibleContext.status !== "present_intact") {
    safeWarnings.push("Manual context sınırı eksik/bozuk olabilir; yalnızca görünen metne dayan.");
  }
  if (insufficiency.needsMoreContext) {
    safeWarnings.push("Bağlam yetersiz olabilir; ek görünür snippet/context iste.");
  }
  if (conflict.hasPotentialConflict) {
    safeWarnings.push("Snippetler arasında uyuşmazlık olabilir; kesin hükümden kaçın.");
  }
  if (references.hasReferences) {
    safeWarnings.push("Referans etiketleri yalnızca görünür etiket olarak ele alınmalı.");
  }

  return {
    hasManualContext: true,
    hasReferences: references.hasReferences,
    hasInsufficiency: insufficiency.needsMoreContext,
    hasConflict: conflict.hasPotentialConflict,
    profile: normalizedProfile,
    shouldUseGroundedStyle: true,
    shouldUseReferenceStyle: references.hasReferences,
    shouldAskForMoreContext:
      insufficiency.needsMoreContext || conflict.needsClarification || answerScenario.shouldAskForMoreContext,
    shouldAvoidDefinitiveClaims: insufficiency.needsMoreContext || conflict.needsClarification,
    shouldUseCompactProfileStyle: profileStyle.safeLengthGuidance.length > 0,
    safePolicyCodes: Array.from(new Set(safePolicyCodes)),
    safeWarnings,
  };
}

export function getManualContextPolicyGuardSummary(
  message: string,
  profile?: NanoProfileType
): string {
  const guard = evaluateManualContextPolicyGuard(message, profile);
  if (!guard.hasManualContext) {
    return "";
  }

  const rules: string[] = [
    "Manual context policy guard: görünür snippet sınırını, grounded dili ve profil uyumlu cevap yoğunluğunu birlikte koru.",
    "Dosya okuma, workspace tarama, retrieval, RAG veya referans takibi iddiası kurma.",
  ];

  if (guard.shouldUseReferenceStyle) {
    rules.push("Referans varsa sadece görünür referans etiketi olarak an.");
  }
  if (guard.shouldAskForMoreContext) {
    rules.push("Yetersizlik/uyuşmazlık durumunda ek görünür context iste.");
  }
  if (guard.shouldAvoidDefinitiveClaims) {
    rules.push("Kesin hükümden kaçın ve varsayımın sınırını açık yaz.");
  }

  return rules.join(" ");
}

export function getManualContextPolicySafeLog(result: ManualContextPolicyGuardResult): {
  profile: NanoProfileType;
  hasManualContext: boolean;
  hasReferences: boolean;
  hasInsufficiency: boolean;
  hasConflict: boolean;
  shouldAskForMoreContext: boolean;
  shouldAvoidDefinitiveClaims: boolean;
  safePolicyCodes: ManualContextPolicyCode[];
  warningCount: number;
} {
  return {
    profile: result.profile,
    hasManualContext: result.hasManualContext,
    hasReferences: result.hasReferences,
    hasInsufficiency: result.hasInsufficiency,
    hasConflict: result.hasConflict,
    shouldAskForMoreContext: result.shouldAskForMoreContext,
    shouldAvoidDefinitiveClaims: result.shouldAvoidDefinitiveClaims,
    safePolicyCodes: result.safePolicyCodes,
    warningCount: result.safeWarnings.length,
  };
}
