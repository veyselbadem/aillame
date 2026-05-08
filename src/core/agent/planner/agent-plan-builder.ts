import { TaskIntent, AgentPlan, WorkspaceAgentContext } from "./types";

export class AgentPlanBuilder {
  build(userTask: string, intent: TaskIntent, context: WorkspaceAgentContext): AgentPlan {
    const steps: AgentPlan["plan"]["steps"] = [
      {
        order: 1,
        title: "Proje Yapısını İncele",
        description: `${context.projectType} projesinde ilgili dizinleri ve önemli dosyaları (özellikle ${context.importantFiles.slice(0, 3).join(", ")}) gözden geçir.`,
        type: "inspect",
        targetPaths: context.relevantDirectories,
        requiresApproval: true
      },
      {
        order: 2,
        title: "Görev Alanını Analiz Et",
        description: `'${intent.category}' kategorisindeki görev için olası etkilenen alanları (${intent.likelyAreas.join(", ") || "tüm proje"}) detaylı incele.`,
        type: "analyze",
        targetPaths: intent.likelyAreas,
        requiresApproval: true
      }
    ];

    // Add category specific steps
    if (intent.category === "bugfix" || intent.category === "runtime") {
      steps.push({
        order: 3,
        title: "Risk ve Hata Kontrolü",
        description: "Hata mesajlarını ve logları (varsa) analiz et, donanım uyumluluğunu (CPU fallback vb.) kontrol et.",
        type: "risk-check",
        requiresApproval: true
      });
    }

    if (intent.category === "test" || intent.riskLevel === "medium" || intent.riskLevel === "high") {
      steps.push({
        order: steps.length + 1,
        title: "Test Önerileri",
        description: "Görevin etkilerini doğrulamak için uygun smoke veya unit testleri belirle.",
        type: "test-suggestion",
        commandSuggestions: this.getCommandSuggestions(context),
        requiresApproval: true
      });
    }

    steps.push({
      order: steps.length + 1,
      title: "Bulgu Raporu Hazırla",
      description: "Yapılan analizleri özetle ve bir sonraki aşama (Patch Proposal) için öneri taslağı oluştur.",
      type: "report",
      requiresApproval: true
    });

    return {
      success: true,
      mode: "read-only-plan",
      task: {
        original: userTask,
        sanitized: userTask.trim().slice(0, 500),
        intent
      },
      workspace: context,
      plan: {
        summary: `${intent.category.toUpperCase()} görevi için ${intent.riskLevel} risk seviyeli analiz planı oluşturuldu.`,
        steps
      },
      safety: {
        readOnly: true,
        willModifyFiles: false,
        willRunCommands: false,
        requiresHumanApprovalBeforeChanges: true,
        excludedSensitiveFiles: [".env", "igm-venv", "model files"],
        warnings: context.warnings
      },
      nextRecommendedPhase: "Agent Execution (Inspect/Analyze)"
    };
  }

  private getCommandSuggestions(context: WorkspaceAgentContext): string[] {
    const cmds = [];
    if (context.detectedFrameworks.includes("Next.js") || context.detectedFrameworks.includes("Vite")) {
      cmds.push("npm.cmd run typecheck", "npm.cmd run build");
    }
    if (context.detectedLanguages.includes("Rust")) {
      cmds.push("cargo check");
    }
    return cmds;
  }
}
