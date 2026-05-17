import { VlmInferenceAdapter } from '../src/core/nano/vision/vlm-inference-adapter';
import fs from 'fs';
import path from 'path';

async function testRealVlmInference() {
    console.log("--- AILLAME REAL VLM INFERENCE TEST ---");

    // 1. Create a minimal valid 1x1 PNG if not exists
    const testImagePath = path.join(process.cwd(), 'scratch', 'test-vlm.png');
    if (!fs.existsSync(path.dirname(testImagePath))) fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
    
    // 1x1 Transparent PNG
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, pngBuffer);

    console.log(`\n1. Testing Image Review with local path: ${testImagePath}`);
    const reviewResult = await VlmInferenceAdapter.analyzeImage({
        image: testImagePath,
        prompt: "Bu görselde ne görüyorsun? Türkçe tek paragraf açıkla."
    });

    console.log("Review Result:", JSON.stringify(reviewResult, null, 2));

    if (reviewResult.success) {
        console.log("SUCCESS: VLM analyzed the image.");
    } else {
        console.log("FAILED:", reviewResult.errorCode, reviewResult.message);
    }

    console.log(`\n2. Testing OCR with base64...`);
    const base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const ocrResult = await VlmInferenceAdapter.analyzeImage({
        image: base64Image,
        prompt: "Bu görseldeki okunabilir metni çıkar ve kısa özetle."
    });

    console.log("OCR Result:", JSON.stringify(ocrResult, null, 2));

    console.log("\nReal VLM Inference test complete.");
}

testRealVlmInference().catch(console.error);
