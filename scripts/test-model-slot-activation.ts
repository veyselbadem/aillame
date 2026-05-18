import { ModelSlotActivationService } from '../src/core/models/model-slot-activation.service';
import { CapabilityRegistry } from '../src/core/models/capability-registry';

async function testActivation() {
    console.log("--- AILLAME MODEL SLOT ACTIVATION TEST ---");

    // 1. Validate Legacy Qwen (Known to exist and be small)
    // We assume the path is .aillame/models/qwen2.5-0.5b-instruct-q4_k_m.gguf based on previous logs
    // For test, we use a relative path or a common one
    const qwenPath = 'C:\\Aillame\\Models\\qwen2.5-0.5b-instruct-q4_k_m.gguf';
    console.log(`\nValidating Qwen Baseline: ${qwenPath}`);
    const qwenVal = await ModelSlotActivationService.validateLocalModelFile(qwenPath);
    console.log(`- Exists: ${qwenVal.exists}`);
    console.log(`- Compatible: ${qwenVal.compatible}`);
    console.log(`- Size: ${(qwenVal.sizeBytes / (1024*1024)).toFixed(2)} MB`);

    // 2. Hardware Fit Estimation
    console.log("\nHardware Fit Estimates (RTX 5060 / 24GB):");
    const sizes = [
        { label: "4B Model", gb: 3 },
        { label: "8B Q4 Model", gb: 5.5 },
        { label: "14B Q4 Model", gb: 10 },
        { label: "26B Q4 Model", gb: 18 }
    ];

    for (const s of sizes) {
        const fit = (ModelSlotActivationService as any).estimateHardwareFit(s.gb);
        console.log(`- ${s.label} (${s.gb}GB): ${fit.compatible ? 'OK' : 'RISKY'} ${fit.warning || ''}`);
    }

    // 3. Activation Preview
    console.log("\nActivation Preview (Qwen3-8B into text.general):");
    const preview = await ModelSlotActivationService.createActivationPreview('qwen3-8b-placeholder', 'text.general');
    console.log(JSON.stringify(preview, null, 2));

    // 4. Fake Path Test
    const fakeVal = await ModelSlotActivationService.validateLocalModelFile('C:\\invalid\\path.gguf');
    console.log(`\nFake Path Test: exists=${fakeVal.exists} (Expected: false)`);

    console.log("\nActivation test complete.");
}

testActivation().catch(console.error);
