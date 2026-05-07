import { scanWorkspaceReadOnly } from "./workspace-scanner";
import { buildWorkspaceAnalysisReport } from "./workspace-report";
import type {
  AillameWorkspaceAnalysisReport,
  AillameWorkspaceScanInput,
  AillameWorkspaceScanResult,
} from "./workspace-types";

export type AillameWorkspaceAnalyzeResult = {
  scan: AillameWorkspaceScanResult;
  report: AillameWorkspaceAnalysisReport;
};

export function analyzeWorkspaceReadOnly(input: AillameWorkspaceScanInput): AillameWorkspaceAnalyzeResult {
  const scan = scanWorkspaceReadOnly(input);
  return {
    scan,
    report: buildWorkspaceAnalysisReport(scan),
  };
}
