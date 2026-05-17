import { ModelSlotActivationService } from '../src/core/models/model-slot-activation.service';
import { InstalledModelRegistryService } from '../src/services/model/installed-model-registry.service';
import path from 'path';
import fs from 'fs';

async function testVlmMetadata() {
    console.log("--- AILLAME VLM METADATA & MMPROJ INFRASTRUCTURE TEST ---");

    // 1. Test Legacy Qwen (Text-only)
    const qwenPath = 'C:\\Aillame\\Models\\qwen2.5-0.5b-instruct-q4_k_m.gguf';
    console.log(`\n1. Validating Text-Only Model: ${path.basename(qwenPath)}`);
    const qwenVal = await ModelSlotActivationService.validateLocalModelFile(qwenPath);
    console.log(`- Exists: ${qwenVal.exists}`);
    console.log(`- mmprojPath: ${qwenVal.mmprojPath || 'None'}`);
    console.log(`- multimodalReady: ${qwenVal.multimodalReady || 'false'}`);
    console.log(`- safeToActivate: ${qwenVal.safeToActivate}`);

    // 2. Validating Qwen3-VL (Actual)
    const vlmPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf';
    console.log(`\n2. Validating Actual VLM: ${vlmPath}`);
    const vlmVal = await ModelSlotActivationService.validateLocalModelFile(vlmPath);
    console.log(`- Exists: ${vlmVal.exists}`);
    console.log(`- mmprojPath: ${vlmVal.mmprojPath || 'None'}`);
    console.log(`- mmprojExists: ${vlmVal.mmprojExists}`);
    console.log(`- multimodalReady: ${vlmVal.multimodalReady || 'false'}`);
    console.log(`- safeToActivate: ${vlmVal.safeToActivate}`);

    // 3. Test Fake VLM (Model exists, mmproj missing)
    // Create a dummy file for testing
    const fakeVlmPath = path.join(process.cwd(), 'scratch', 'fake-vision-model.gguf');
    if (!fs.existsSync(path.dirname(fakeVlmPath))) fs.mkdirSync(path.dirname(fakeVlmPath), { recursive: true });
    
    // GGUF magic number 'GGUF'
    fs.writeFileSync(fakeVlmPath, Buffer.from([0x47, 0x47, 0x55, 0x46, 0, 0, 0, 0]));
    
    console.log(`\n3. Validating VLM with missing mmproj: ${path.basename(fakeVlmPath)}`);
    const fakeVal = await ModelSlotActivationService.validateLocalModelFile(fakeVlmPath);
    console.log(`- Exists: ${fakeVal.exists}`);
    console.log(`- mmprojPath: ${fakeVal.mmprojPath}`);
    console.log(`- mmprojExists: ${fakeVal.mmprojExists}`);
    console.log(`- multimodalReady: ${fakeVal.multimodalReady}`);
    console.log(`- safeToActivate: ${fakeVal.safeToActivate} (Expected: false)`);
    console.log(`- Error: ${fakeVal.unsupportedReason}`);

    // 4. Test Ready VLM (Both exist)
    const fakeMmprojPath = fakeVlmPath.replace('.gguf', '.mmproj.gguf');
    fs.writeFileSync(fakeMmprojPath, 'dummy projector');
    
    console.log(`\n4. Validating Ready VLM: Both files exist`);
    const readyVal = await ModelSlotActivationService.validateLocalModelFile(fakeVlmPath);
    console.log(`- mmprojExists: ${readyVal.mmprojExists}`);
    console.log(`- multimodalReady: ${readyVal.multimodalReady}`);
    console.log(`- safeToActivate: ${readyVal.safeToActivate} (Expected: true)`);

    // Clean up
    fs.unlinkSync(fakeVlmPath);
    fs.unlinkSync(fakeMmprojPath);

    console.log("\nVLM Metadata test complete.");
}

testVlmMetadata().catch(console.error);
