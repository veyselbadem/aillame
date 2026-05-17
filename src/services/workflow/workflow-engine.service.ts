import { 
  WorkflowStep, 
  WorkflowContext, 
  WorkflowResult, 
  StepResult, 
  WorkflowStatus 
} from "./workflow.types";
import { SingleWorkflowGuard } from "./single-workflow-guard";
import { SchemaValidator } from "../schema";
import { AuditLogService } from "../audit/audit-log.service";
import { randomUUID } from 'crypto';

export class WorkflowEngine {
  static async run(params: {
    workflowName: string;
    project?: string;
    input: any;
    steps: WorkflowStep[];
    metadata?: Record<string, unknown>;
    finalSchemaId?: string;
  }): Promise<WorkflowResult> {
    const workflowId = randomUUID();
    const startedAt = new Date().toISOString();
    
    if (!params.steps || params.steps.length === 0) {
      const finishedAt = new Date().toISOString();
      const result: WorkflowResult = {
        workflowId,
        workflowName: params.workflowName,
        status: 'failed',
        startedAt,
        finishedAt,
        durationMs: 0,
        steps: [],
        error: {
          code: 'WORKFLOW_STEPS_REQUIRED',
          message: 'At least one step is required to run a workflow.'
        }
      };
      await AuditLogService.appendWorkflowResult(result);
      return result;
    }

    try {
      SingleWorkflowGuard.acquire(workflowId);
    } catch (e: any) {
      const finishedAt = new Date().toISOString();
      const result: WorkflowResult = {
        workflowId,
        workflowName: params.workflowName,
        status: 'failed',
        startedAt,
        finishedAt,
        durationMs: 0,
        steps: [],
        error: {
          code: 'WORKFLOW_ALREADY_RUNNING',
          message: 'A workflow is already running.'
        }
      };
      // Note: We don't necessarily log this to audit log if it didn't even start
      return result;
    }

    const context: WorkflowContext = {
      workflowId,
      workflowName: params.workflowName,
      project: params.project,
      startedAt,
      metadata: params.metadata,
      permissionMode: "read_only"
    };

    const stepResults: StepResult[] = [];
    let currentInput = params.input;
    let finalStatus: WorkflowStatus = 'success';
    let workflowError: any = undefined;

    const startTime = Date.now();

    for (const step of params.steps) {
      const stepStartTime = Date.now();
      try {
        const result = await step.run(currentInput, context);
        result.durationMs = Date.now() - stepStartTime;
        stepResults.push(result);

        if (result.status === 'failed') {
          finalStatus = 'failed';
          workflowError = result.error;
          break;
        }

        currentInput = result.output;
      } catch (error: any) {
        stepResults.push({
          stepId: step.id,
          name: step.name,
          status: 'failed',
          startedAt: new Date(stepStartTime).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - stepStartTime,
          error: {
            code: 'WORKFLOW_STEP_FAILED',
            message: error.message || 'Unknown step error'
          }
        });
        finalStatus = 'failed';
        workflowError = {
          code: 'WORKFLOW_STEP_FAILED',
          message: error.message || 'Unknown step error'
        };
        break;
      }
    }

    // Schema Validation if requested
    if (finalStatus === 'success' && params.finalSchemaId) {
      const validation = SchemaValidator.validate(params.finalSchemaId, currentInput);
      if (!validation.valid) {
        finalStatus = 'failed';
        workflowError = {
          code: 'SCHEMA_VALIDATION_FAILED',
          message: 'Output does not match the required schema.',
          details: validation.errors
        };
      }
    }

    const finishedAt = new Date().toISOString();
    const workflowResult: WorkflowResult = {
      workflowId,
      workflowName: params.workflowName,
      status: finalStatus,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startTime,
      steps: stepResults,
      output: finalStatus === 'success' ? currentInput : undefined,
      error: workflowError
    };

    try {
      await AuditLogService.appendWorkflowResult(workflowResult);
    } finally {
      SingleWorkflowGuard.release(workflowId);
    }

    return workflowResult;
  }
}
