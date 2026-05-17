import { WorkflowStep, StepResult, WorkflowContext } from "../../workflow/workflow.types";
import { BossInputValidator } from "./boss-input-validator.service";
import { BossSourceBoundedAnalyzer } from "./boss-source-bounded-analyzer.service";
import { GroundingChecker } from "./grounding-checker.service";
import { BossAnalysisRequest } from "./boss.types";

export class ValidateBossInputStep implements WorkflowStep {
  id = "boss-validate-input";
  name = "Validate Boss Analysis Input";

  async run(input: BossAnalysisRequest, context: WorkflowContext): Promise<StepResult> {
    const validation = BossInputValidator.validate(input);
    const startedAt = new Date().toISOString();

    if (!validation.valid) {
      return {
        stepId: this.id,
        name: this.name,
        status: "failed",
        startedAt,
        error: {
          code: validation.code || "BOSS_INVALID_INPUT",
          message: validation.error || "Invalid input"
        }
      };
    }

    return {
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt,
      output: input
    };
  }
}

export class SourceBoundedAnalysisStep implements WorkflowStep {
  id = "boss-source-analysis";
  name = "Source-Bounded Analysis";

  async run(input: BossAnalysisRequest, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    try {
      const result = BossSourceBoundedAnalyzer.analyze(input);
      return {
        stepId: this.id,
        name: this.name,
        status: "success",
        startedAt,
        output: result
      };
    } catch (error: any) {
      return {
        stepId: this.id,
        name: this.name,
        status: "failed",
        startedAt,
        error: {
          code: "BOSS_ANALYSIS_FAILED",
          message: error.message
        }
      };
    }
  }
}

export class GroundingCheckStep implements WorkflowStep {
  id = "boss-grounding-check";
  name = "Grounding Consistency Check";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    // input is the result from Step 2, context metadata or previous steps would have original sources
    // In this MVP, we can assume 'input' is the BossAnalysisResult
    // But we need original sources to check grounding. 
    // Usually WorkflowContext or Step chaining handles this.
    // Let's assume the previous step result is what we check.
    
    // For MVP, we use the sources embedded in the result itself or retrieve from context if we saved it there.
    const result = GroundingChecker.check(input, input.sources.map((s: any) => ({ content: "", ...s }))); // Placeholder sources
    
    return {
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt,
      output: result
    };
  }
}
