import { ModelSlotActivationService } from '../src/core/models/model-slot-activation.service';

async function testVlmPreview() {
    console.log("--- AILLAME VLM ACTIVATION PREVIEW TEST ---");

    const modelId = 'qwen3-vl-4b-instruct-q4-k-m';
    const slot = 'nano.multimodal.core';

    console.log(`\nGenerating preview for ${modelId} into ${slot}...`);
    
    try {
        const preview = await ModelSlotActivationService.createActivationPreview(modelId, slot as any);
        console.log(JSON.stringify(preview, null, 2));
        
        console.log("\nValidation Details:");
        console.log(`- Model Exists: ${preview.hardwareFit.compatible}`); // This is simplified in the preview structure
        console.log(`- Safe to Activate: ${preview.needsApproval ? 'Needs Approval' : 'Auto'}`);
        console.log(`- Reason: ${preview.approvalReason}`);
    } catch (error) {
        console.error("Preview failed:", error);
    }

    console.log("\nVLM Activation Preview test complete.");
}

testVlmPreview().catch(console.error);
