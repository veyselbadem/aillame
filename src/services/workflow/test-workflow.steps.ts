import { WorkflowStep, WorkflowContext, StepResult } from "./workflow.types";

export class BuildHardcodedQuestionPlanStep implements WorkflowStep {
  id = "step-1-build-plan";
  name = "Build Hardcoded Question Plan";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const output = {
      questionText: "Aşağıdaki şekillerden hangisi üçgendir?",
      visualSpec: {
        kind: "geometry_diagram",
        items: [
          { label: "A", shape: "square" },
          { label: "B", shape: "circle" },
          { label: "C", shape: "triangle" },
          { label: "D", shape: "rectangle" }
        ]
      },
      options: ["A", "B", "C", "D"],
      correctAnswer: "C",
      explanation: "Üçgenin 3 kenarı vardır.",
      layoutHint: "question_with_image"
    };

    return {
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt: new Date().toISOString(),
      output
    };
  }
}

export class AddPlaceholderImageAndConsistencyStep implements WorkflowStep {
  id = "step-2-add-assets";
  name = "Add Placeholder Image and Consistency";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const output = {
      ...input,
      imageResult: {
        type: "placeholder",
        spec: input.visualSpec,
        prompt: "İlkokul düzeyine uygun sade geometri görseli."
      },
      consistency: {
        passed: true,
        checks: [
          "correctAnswer_exists_in_options",
          "visualSpec_contains_correct_option",
          "explanation_matches_answer"
        ]
      }
    };

    return {
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt: new Date().toISOString(),
      output
    };
  }
}

export class InvalidOutputStep implements WorkflowStep {
    id = "step-invalid";
    name = "Generate Invalid Output";
  
    async run(input: any, context: WorkflowContext): Promise<StepResult> {
      const output = {
        questionText: "Hatalı Soru",
        // missing fields
      };
  
      return {
        stepId: this.id,
        name: this.name,
        status: "success",
        startedAt: new Date().toISOString(),
        output
      };
    }
  }
