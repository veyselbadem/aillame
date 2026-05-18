import { getLlama } from "node-llama-cpp";
import path from "path";
import fs from "fs";

async function runTest(useGpu, gpuLayers) {
    console.log(`\n--- Starting Test (GPU: ${useGpu}, Layers: ${gpuLayers}) ---`);
    const startTime = Date.now();
    
    try {
        const llama = await getLlama({
            gpu: useGpu ? "auto" : false
        });
        
        console.log(`[Diagnostic] Llama support: ${llama.gpu ? "GPU (" + llama.gpu + ")" : "CPU ONLY"}`);
        
        const modelPath = "C:\\Aillame\\Models\\qwen2.5-0.5b-instruct-q4_k_m.gguf";
        if (!fs.existsSync(modelPath)) {
            console.error(`Model not found at ${modelPath}`);
            return null;
        }

        const modelLoadStart = Date.now();
        const model = await llama.loadModel({
            modelPath,
            gpuLayers: useGpu ? gpuLayers : 0
        });
        const modelLoadDuration = Date.now() - modelLoadStart;
        console.log(`[Diagnostic] Model loaded in ${modelLoadDuration}ms`);

        const { LlamaChatSession } = await import("node-llama-cpp");
        const context = await model.createContext();
        const sequence = context.getSequence();
        const session = new LlamaChatSession({
            contextSequence: sequence
        });

        const prompts = [
            "Merhaba, tek cümleyle kendini tanıt.",
            "HTML'de basit bir buton kodu yaz.",
            "Türkçe karakter testi: ç, ğ, ı, İ, ö, ş, ü"
        ];

        const results = [];
        for (const prompt of prompts) {
            console.log(`\nTesting prompt: "${prompt}"`);
            const pStart = Date.now();
            let firstTokenTime = 0;
            let totalTokens = 0;

            const response = await session.prompt(prompt + "\n\nASSISTANT:", {
                maxTokens: 128,
                onToken: (tokens) => {
                    if (firstTokenTime === 0) firstTokenTime = Date.now() - pStart;
                    totalTokens++;
                }
            });

            const pEnd = Date.now();
            const duration = pEnd - pStart;
            const tps = (totalTokens / (duration / 1000)).toFixed(2);

            console.log(`Response: ${response.substring(0, 50)}...`);
            console.log(`First Token: ${firstTokenTime}ms, Total: ${duration}ms, Speed: ${tps} t/s`);
            
            results.push({
                prompt,
                latencyMs: duration,
                firstTokenMs: firstTokenTime,
                tps,
                response: response.substring(0, 30) + "..."
            });
        }

        session.dispose();
        return {
            gpu: llama.gpu || "none",
            modelLoadDuration,
            results
        };

    } catch (err) {
        console.error(`Test failed:`, err.message);
        return { error: err.message };
    }
}

async function main() {
    console.log("AILLAME HARDWARE PERFORMANCE PROBE");
    console.log("====================================");
    
    // CPU Run
    const cpuResults = await runTest(false, 0);
    
    // GPU Run
    const gpuResults = await runTest(true, 32); // Qwen 0.5B has ~24 layers, 32 is safe to offload all

    console.log("\n\nFINAL COMPARISON");
    console.log("----------------");
    console.log(JSON.stringify({ cpu: cpuResults, gpu: gpuResults }, null, 2));
}

main().catch(console.error);
