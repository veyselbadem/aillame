import { WorkflowEngine } from "../../workflow/workflow-engine.service";
import { ValidateDoomsgameInputStep, ScanProjectReadOnlyStep, BuildDoomsgamePlanStep } from "./doomsgame-readonly.steps";
import { DoomsgamePlanRequest } from "./doomsgame.types";

export class DoomsgameReadonlyPlanService {
  /**
   * Runs the Doomsgame read-only planning workflow.
   */
  static async plan(request: DoomsgamePlanRequest) {
    const steps = [
      new ValidateDoomsgameInputStep(),
      new ScanProjectReadOnlyStep(),
      new BuildDoomsgamePlanStep()
    ];

    const result = await WorkflowEngine.run({
      workflowName: "doomsgame.read_only_plan",
      project: "doomsgame",
      input: request,
      steps,
      finalSchemaId: "doomsgame-plan"
    });

    return result;
  }
}
