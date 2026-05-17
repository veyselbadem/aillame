import { CapabilityId } from '../../models/capability-types';
import { NanoIntent, NanoExecutionSummaryForLearning } from '../contracts/nano-contract.types';

/**
 * Nano Feedback & Learning Types - Phase H
 */

export type NanoFeedbackSource = 
  | 'user_rating'
  | 'execution_result'
  | 'correction'
  | 'rejected_output'
  | 'accepted_output'
  | 'system_observation';

export interface NanoFeedbackRecord {
  feedbackId: string;
  taskId: string;
  planId: string;
  timestamp: string;
  source: NanoFeedbackSource;
  language: string;
  userMessageSummary: string; // Redacted or summarized
  intent: NanoIntent;
  requiredCapabilities: CapabilityId[];
  selectedCapabilities: CapabilityId[];
  selectedModels: string[];
  executionSummary: NanoExecutionSummaryForLearning;
  userFeedback?: {
    rating: 'up' | 'down' | 'neutral';
    comment?: string;
    correctedIntent?: NanoIntent;
    correctedCapability?: CapabilityId[];
    accepted?: boolean;
  };
  qualitySignals: string[];
  safetyFlags: string[];
  safeForTraining: boolean;
  requiresReview: boolean;
  reviewReason?: string;
  redactionStatus: 'clean' | 'redacted' | 'unsafe';
  schemaVersion: string;
}

export interface NanoTrainingCandidate {
  candidateId: string;
  sourceFeedbackId: string;
  input: string;
  expectedDecision: Record<string, any>;
  expectedPlan: Record<string, any>;
  preferredOutput?: string;
  rejectedOutput?: string;
  tags: string[];
  language: string;
  safeForTraining: boolean;
  approvedBy?: string;
  approvedAt?: string;
  schemaVersion: string;
}
