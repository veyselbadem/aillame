import { WorkflowStep, StepResult, WorkflowContext } from "../../workflow/workflow.types";
import { BademakademiSvgImageRuntimeAdapter } from "./svg/bademakademi-svg-image-runtime-adapter";

/**
 * Step 1: Builds a hardcoded question plan for Bademakademi.
 */
export class BuildBademakademiQuestionPlanStep implements WorkflowStep {
  id = "bademakademi-build-plan";
  name = "Build Bademakademi Question Plan";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const gradeLevel = input.gradeLevel || 3;
    const course = input.course || "Matematik";
    const topic = input.topic || "Geometri";
    const startedAt = new Date().toISOString();

    // Deterministic hardcoded output
    const output = {
      gradeLevel,
      course,
      topic,
      usePlaceholder: input.usePlaceholder, // Preserve for next steps
      questionType: input.questionType || "multiple_choice",
      questionText: `[Sınıf ${gradeLevel}] ${course} - ${topic}: Aşağıdaki şekillerden hangisi üçgendir?`,
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
      explanation: "Üçgenin 3 kenarı vardır. Görseldeki C seçeneği bir üçgendir.",
      layoutHint: "question_with_image"
    };

    return { 
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt,
      output 
    };
  }
}

/**
 * Step 2: Adds a placeholder image result to the question.
 */
export class BuildPlaceholderImageResultStep implements WorkflowStep {
  id = "bademakademi-placeholder-image";
  name = "Build Placeholder Image Result";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    const usePlaceholder = input.usePlaceholder === true;

    if (usePlaceholder) {
      const output = {
        ...input,
        imageResult: {
          type: "placeholder",
          spec: input.visualSpec,
          prompt: "İlkokul düzeyine uygun sade geometri görseli."
        }
      };
      delete output.usePlaceholder; // Cleanup
      return { stepId: this.id, name: this.name, status: "success", startedAt, output };
    }

    // Default: Generate SVG
    const svgResult = await BademakademiSvgImageRuntimeAdapter.generate(input.visualSpec);
    const output = {
      ...input,
      imageResult: svgResult
    };
    delete output.usePlaceholder; // Cleanup

    return { 
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt,
      output 
    };
  }
}

/**
 * Step 3: Checks structural and logical consistency of the question.
 */
export class StructuralConsistencyCheckerStep implements WorkflowStep {
  id = "bademakademi-consistency-check";
  name = "Structural Consistency Checker";

  async run(input: any, context: WorkflowContext): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    const checks: string[] = [];
    const errors: string[] = [];

    // 1. Options check
    if (Array.isArray(input.options) && input.options.length >= 2) {
      checks.push("options_array_valid");
    } else {
      errors.push("Options must be an array with at least 2 items.");
    }

    // 2. Correct answer exists in options
    if (input.options.includes(input.correctAnswer)) {
      checks.push("correctAnswer_exists_in_options");
    } else {
      errors.push(`Correct answer '${input.correctAnswer}' is not in options: ${input.options.join(", ")}`);
    }

    // 3. Visual spec consistency
    if (input.visualSpec && Array.isArray(input.visualSpec.items)) {
      const labels = input.visualSpec.items.map((it: any) => it.label);
      if (labels.includes(input.correctAnswer)) {
        checks.push("visualSpec_contains_correct_option");
      } else {
        errors.push(`Correct answer label '${input.correctAnswer}' not found in visualSpec items.`);
      }
    }

    // 4. Explanation check
    if (input.explanation && input.explanation.length > 5) {
      checks.push("explanation_is_sufficient");
    } else {
      errors.push("Explanation is missing or too short.");
    }

    // 5. ImageResult check
    if (input.imageResult) {
      if (input.imageResult.type === "placeholder") {
        checks.push("imageResult_is_placeholder");
      } else if (input.imageResult.type === "svg") {
        if (input.imageResult.data && input.imageResult.data.startsWith("<svg")) {
          checks.push("imageResult_is_svg");
        } else {
          errors.push("imageResult type is 'svg' but data is not a valid SVG string.");
        }
      }
    }

    if (errors.length > 0) {
      return {
        stepId: this.id,
        name: this.name,
        status: "failed",
        startedAt,
        error: {
          code: "BADEMAKADEMI_CONSISTENCY_FAILED",
          message: errors.join(" | ")
        },
        output: { ...input, consistency: { passed: false, errors, checks } }
      };
    }

    const output = {
      ...input,
      consistency: {
        passed: true,
        checks
      }
    };

    return { 
      stepId: this.id,
      name: this.name,
      status: "success",
      startedAt,
      output 
    };
  }
}
