import { WorkflowStep, StepResult, WorkflowContext } from "../../workflow/workflow.types";
import { DoomsgameInputValidator } from "./doomsgame-input-validator.service";
import { DoomsgameProjectScanner } from "./doomsgame-project-scanner.service";
import { DoomsgameReadOnlyPlanner } from "./doomsgame-readonly-planner.service";
import { DoomsgamePlanRequest } from "./doomsgame.types";

export class ValidateDoomsgameInputStep implements WorkflowStep {
  id = "doomsgame-validate-input";
  name = "Validate Doomsgame Input";

  async run(input: DoomsgamePlanRequest, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    const validation = DoomsgameInputValidator.validate(input);

    if (!validation.valid) {
      return {
        stepId: this.id,
        name: this.name,
        status: "failed",
        startedAt,
        error: {
          code: validation.code || "DOOMSGAME_INVALID_INPUT",
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

export class ScanProjectReadOnlyStep implements WorkflowStep {
  id = "doomsgame-scan-project";
  name = "Scan Project Read-Only";

  async run(input: DoomsgamePlanRequest, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    
    if (!input.projectPath) {
      return {
        stepId: this.id,
        name: this.name,
        status: "success",
        startedAt,
        output: { request: input, scan: { scanned: false, files: [], ignoredDirectories: [], ignoredFiles: [], warnings: [] } }
      };
    }

    const scan = DoomsgameProjectScanner.scan(input.projectPath);
    
    return {
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt,
      output: { request: input, scan }
    };
  }
}

export class BuildDoomsgamePlanStep implements WorkflowStep {
  id = "doomsgame-build-plan";
  name = "Build Doomsgame Game Plan";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    const { request, scan } = input;

    try {
      const plan = DoomsgameReadOnlyPlanner.plan(request, scan);
      return {
        stepId: this.id,
        name: this.name,
        status: "success",
        startedAt,
        output: plan
      };
    } catch (error: any) {
      return {
        stepId: this.id,
        name: this.name,
        status: "failed",
        startedAt,
        error: {
          code: "DOOMSGAME_PLAN_FAILED",
          message: error.message
        }
      };
    }
  }
}
