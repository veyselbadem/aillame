import { GgufRuntimeService } from '../src/services/runtimes/gguf-runtime.service';

async function testVlmLoad() {
    console.log("--- AILLAME VLM LOAD TEST (DRY RUN) ---");

    const runtime = new GgufRuntimeService();
    const modelId = 'qwen3-vl-4b-instruct-q4-k-m';

    console.log(`\nAttempting to load VLM: ${modelId}...`);
    console.log("(Note: This will actually initialize node-llama-cpp and load the files into VRAM)");

    // Since we don't have a direct 'load' method exposed in the adapter interface, 
    // we use generate with a tiny prompt to trigger loading.
    const result = await runtime.generate({
        modelId,
        prompt: {
            messages: [],
            plainText: "Test"
        },
        options: { maxOutputTokens: 1 }
    });

    if (result.success) {
        console.log("SUCCESS: VLM loaded and responded.");
        console.log("Response:", result.text);
    } else {
        console.log("FAILED:", result.error.message);
        if (result.error.code === 'MMPROJ_MISSING') {
            console.log("Error: Vision projector missing in registry or disk.");
        }
    }

    console.log("\nVLM Load test complete.");
}

testVlmLoad().catch(console.error);
