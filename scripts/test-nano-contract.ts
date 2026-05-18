import { NanoPlanBuilder } from '../src/core/nano/contracts/nano-plan-builder';

async function testNanoContract() {
    console.log("--- AILLAME NANO CONTRACT TEST ---");

    // Scenario 1: Simple Chat
    const task1 = NanoPlanBuilder.createInput({ message: "Merhaba, kendini tanıt." });
    const plan1 = NanoPlanBuilder.createPlan({ 
        taskId: task1.taskId, 
        intent: 'chat', 
        requiredCapabilities: ['text.general'],
        confidence: 0.95
    });
    const decision1 = await NanoPlanBuilder.buildDecision(plan1);
    console.log("Scenario 1 (Chat):", {
        intent: decision1.intent,
        models: decision1.selectedModels,
        degraded: decision1.degraded
    });

    // Scenario 2: SEO Content with placeholders
    const plan2 = NanoPlanBuilder.createPlan({
        intent: 'seo_content',
        requiredCapabilities: ['text.general', 'image.generate', 'safety.review'],
        confidence: 0.85
    });
    const decision2 = await NanoPlanBuilder.buildDecision(plan2);
    console.log("Scenario 2 (SEO):", {
        intent: decision2.intent,
        degraded: decision2.degraded,
        warnings: decision2.warnings.length
    });

    // Scenario 3: System Action (Approval required)
    const plan3 = NanoPlanBuilder.createPlan({
        intent: 'system_action',
        safetyFlags: ['model_download_requested'],
        requiredCapabilities: ['legacy.test']
    });
    console.log("Scenario 3 (Approval):", {
        needsApproval: plan3.needsUserApproval,
        reason: plan3.approvalReason
    });

    // Scenario 4: Gemma (Archived/Unsupported)
    const plan4 = NanoPlanBuilder.createPlan({
        intent: 'text_generation',
        requiredCapabilities: ['archive.research' as any] // Testing archived resolution
    });
    const decision4 = await NanoPlanBuilder.buildDecision(plan4);
    console.log("Scenario 4 (Archived):", {
        models: decision4.selectedModels,
        degraded: decision4.degraded
    });

    // Final Sanitization Check
    const sanitized = NanoPlanBuilder.sanitizeForClient(decision1);
    console.log("Sanitization Check:", {
        hasDebug: (sanitized as any)._internalDebug !== undefined,
        success: sanitized.success
    });
}

testNanoContract().catch(console.error);
