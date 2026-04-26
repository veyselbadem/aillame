export type TrainingDataSource = 'memory_card' | 'distillation_preview' | 'manual' | 'feedback' | 'ai_lab';
export type TrainingRiskLevel = 'low' | 'medium' | 'high';

export interface NanoTrainingRecord {
  id: string;
  instruction: string;
  input?: string;
  output: string;
  source: TrainingDataSource;
  sourceId: string;
  riskLevel: TrainingRiskLevel;
  approved: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface NanoTrainingExportResult {
  success: boolean;
  count: number;
  data: NanoTrainingRecord[];
  timestamp: number;
}
