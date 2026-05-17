import { NanoDecisionEngine } from "../../services/nano/nano-decision-engine.service";
import { BademakademiContractService } from "../../services/projects/bademakademi/bademakademi-contract.service";
import { BossSourceBoundedService } from "../../services/projects/boss/boss-source-bounded.service";
import { DoomsgameReadonlyPlanService } from "../../services/projects/doomsgame/doomsgame-readonly-plan.service";
import { NanoAnswer } from "../nano/types";

export interface UnifiedRequest {
  prompt: string;
  context?: Record<string, any>;
  sourceApp?: string;
  metadata?: Record<string, any>;
}

export interface UnifiedResponse {
  ok: boolean;
  decision: {
    project: string;
    workflow: string;
    reasoning: string;
  };
  output: any;
  diagnostics: any;
}

export class UnifiedRouter {
  /**
   * Routes a unified request to the appropriate workflow via NanoDecisionEngine.
   */
  static async execute(request: UnifiedRequest): Promise<UnifiedResponse> {
    console.log(`[UnifiedRouter] Processing request from: ${request.sourceApp || "unknown"}`);
    
    // 1. Ask Nano Decision Engine
    const decisionResult = await NanoDecisionEngine.decide({
      prompt: request.prompt,
      metadata: request.metadata
    });

    if (!decisionResult.ok) {
      return {
        ok: false,
        decision: {
          project: "unknown",
          workflow: "none",
          reasoning: decisionResult.error?.message || "Karar verilemedi."
        },
        output: null,
        diagnostics: decisionResult.diagnostics
      };
    }

    const { project, workflow, reasoningSummary } = decisionResult.decision;
    const reasoning = reasoningSummary || "Nano karar motoru tarafından yönlendirildi.";
    
    console.log(`[UnifiedRouter] Karar: ${project}, Çalıştırılan Workflow: ${workflow}`);
    console.log(`[UnifiedRouter] Sebep: ${reasoning}`);

    let output: any = null;

    // 2. Execute the mapped workflow
    try {
      switch (project) {
        case "bademakademi":
          output = await BademakademiContractService.generateQuestion({
            topic: request.prompt,
            ...request.context
          });
          break;

        case "boss":
          output = await BossSourceBoundedService.analyze({
            analysisRequest: request.prompt,
            sources: request.context?.sources || [],
            ...request.context
          });
          break;

        case "doomsgame":
          output = await DoomsgameReadonlyPlanService.plan({
            prompt: request.prompt,
            projectPath: request.context?.projectPath || "default_dooms_project",
            ...request.context
          });
          break;

        case "generic":
        default: {
          const { AillameNanoController } = await import("../nano/nano-controller");
          const controller = new AillameNanoController();
          const answer = await controller.answer({ prompt: request.prompt });
          output = {
            message: "Aillame Nano genel sohbet modunda yanıt veriyor.",
            content: answer.content,
            classification: "generic",
            plan: answer.plan
          };
          break;
        }
      }

      // 3. Silent Distillation Data Collection (Phase 4.1)
      try {
        const textOutput = typeof output === 'string' 
          ? output 
          : (output?.content || output?.message || JSON.stringify(output));
          
        import('../../services/distillation/distillation-store.service').then(({ DistillationStoreService }) => {
          DistillationStoreService.record({
            instruction: request.prompt,
            output: textOutput,
            project: project,
            timestamp: Date.now()
          });
        }).catch(() => {}); // Silent fail
      } catch (distillError) {
        // Asenkron ve sessiz olmalı
      }

      return {
        ok: true,
        decision: {
          project,
          workflow,
          reasoning
        },
        output,
        diagnostics: decisionResult.diagnostics
      };

    } catch (error: any) {
      console.error(`[UnifiedRouter] Workflow execution failed:`, error);
      return {
        ok: false,
        decision: {
          project,
          workflow,
          reasoning
        },
        output: {
          error: error.message || "İş akışı sırasında hata oluştu."
        },
        diagnostics: decisionResult.diagnostics
      };
    }
  }
}
