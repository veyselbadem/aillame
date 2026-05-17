import { WorkflowEngine } from "../../workflow/workflow-engine.service";
import { 
  BuildBademakademiQuestionPlanStep, 
  BuildPlaceholderImageResultStep, 
  StructuralConsistencyCheckerStep 
} from "./bademakademi-contract.steps";

export interface BademakademiQuestionRequest {
  gradeLevel?: number;
  course?: string;
  topic?: string;
  questionType?: string;
  requiresImage?: boolean;
}

export class BademakademiContractService {
  /**
   * Runs the Bademakademi contract smoke test workflow.
   */
  static async generateQuestion(request: BademakademiQuestionRequest = {}) {
    const defaultInput = {
      gradeLevel: 3,
      course: "Matematik",
      topic: "Geometri",
      questionType: "multiple_choice",
      requiresImage: true,
      ...request
    };

    const steps = [
      new BuildBademakademiQuestionPlanStep(),
      new BuildPlaceholderImageResultStep(),
      new StructuralConsistencyCheckerStep()
    ];

    const result = await WorkflowEngine.run({
      workflowName: "bademakademi.contract_smoke_test",
      input: defaultInput,
      steps,
      finalSchemaId: "bademakademi-question"
    });

    return result;
  }

  /**
   * Runs an invalid workflow to test consistency failure.
   */
  static async generateInvalidQuestion() {
    const steps = [
      new BuildBademakademiQuestionPlanStep(),
      // Inject an error in the output of step 1 before step 3 runs
      {
        id: "inject-error",
        name: "Inject Error Step",
        run: async (input: any) => ({
          stepId: "inject-error",
          name: "Inject Error Step",
          status: 'success' as const,
          startedAt: new Date().toISOString(),
          output: { ...input, correctAnswer: "Z" } // Z is not in options A, B, C, D
        })
      },
      new StructuralConsistencyCheckerStep()
    ];

    const result = await WorkflowEngine.run({
      workflowName: "bademakademi.invalid_contract_test",
      input: {},
      steps,
      finalSchemaId: "bademakademi-question"
    });

    return result;
  }
}
