export type BetaQaStatus = 'passed' | 'warning' | 'failed' | 'not-configured' | 'manual-required' | 'planned';

export interface BetaQaCheck {
  id: string;
  label: string;
  status: BetaQaStatus;
  note?: string;
}

export interface BetaQaSection {
  id: string;
  label: string;
  status: BetaQaStatus;
  checks: BetaQaCheck[];
}

export interface BetaKnownIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  workaround?: string;
}

export interface BetaReleaseBlocker {
  id: string;
  description: string;
  requirement: string;
}

export interface BetaReleaseCandidateReport {
  versionLabel: string;
  generatedAt: number;
  overallStatus: BetaQaStatus;
  betaFoundationReady: boolean;
  liveRuntimeAcceptanceReady: boolean;
  textRuntimeAcceptance: {
    available: boolean;
    ready: boolean;
    status: BetaQaStatus;
    reason?: string;
  };
  imageRuntimeAcceptance: {
    available: boolean;
    ready: boolean;
    status: BetaQaStatus;
    reason?: string;
  };
  sections: BetaQaSection[];
  blockers: BetaReleaseBlocker[];
  knownIssues: BetaKnownIssue[];
  nextActions: string[];
}
