import { WorkflowEngine } from "../../workflow/workflow-engine.service";
import { ValidateBossInputStep, SourceBoundedAnalysisStep, GroundingCheckStep } from "./boss-source-bounded.steps";
import { BossAnalysisRequest } from "./boss.types";

export class BossSourceBoundedService {
  /**
   * Runs the Boss source-bounded analysis workflow.
   */
  static async analyze(request: BossAnalysisRequest) {
    const steps = [
      new ValidateBossInputStep(),
      new SourceBoundedAnalysisStep(),
      new GroundingCheckStep()
    ];

    const result = await WorkflowEngine.run({
      workflowName: "boss.source_bounded_analysis",
      project: "boss",
      input: request,
      steps,
      finalSchemaId: "boss-analysis"
    });

    return result;
  }
}
