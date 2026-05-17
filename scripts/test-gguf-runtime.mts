import { getLlama, LlamaChatSession } from "node-llama-cpp";
import path from "path";
import fs from "fs";

/**
 * Aillame Phase 1: Node-only GGUF Reality Test
 * 
 * Amaç: node-llama-cpp ve GGUF model yükleme sürecinin 
 * Node.js ortamında (Tauri/UI bağımsız) çalıştığını doğrulamak.
 */

async function main() {
  const modelPathArg = process.argv[2];

  console.log("\n--- AILLAME PHASE 1: GGUF REALITY TEST ---\n");

  if (!modelPathArg) {
    console.error("[ERROR] Model yolu belirtilmedi.");
    console.log("Kullanım: npm run test:gguf -- /mutlak/yol/model.gguf");
    process.exit(1);
  }

  const modelPath = path.isAbsolute(modelPathArg) 
    ? modelPathArg 
    : path.resolve(process.cwd(), modelPathArg);

  console.log(`[STEP 1] Model yolu kontrol ediliyor: ${modelPath}`);
  if (!fs.existsSync(modelPath)) {
    console.error("[ERROR] Model dosyası bulunamadı.");
    process.exit(1);
  }
  const stats = fs.statSync(modelPath);
  if (!stats.isFile()) {
    console.error("[ERROR] Belirtilen yol bir dosya değil.");
    process.exit(1);
  }
  console.log(`[SUCCESS] Dosya mevcut. Boyut: ${(stats.size / (1024 * 1024 * 1024)).toFixed(2)} GB`);

  console.log("[STEP 2] node-llama-cpp yükleniyor...");
  let llama;
  try {
    llama = await getLlama();
    console.log("[SUCCESS] node-llama-cpp başarıyla yüklendi.");
  } catch (err: any) {
    console.error(`[ERROR] node-llama-cpp yüklenemedi: ${err.message}`);
    console.log("İpucu: 'npm install node-llama-cpp' komutunu çalıştırdığınızdan emin olun.");
    process.exit(1);
  }

  console.log("[STEP 3] Model belleğe yükleniyor (RAM/VRAM)...");
  const loadStartTime = Date.now();
  let model;
  try {
    model = await llama.loadModel({
      modelPath: modelPath
    });
    console.log(`[SUCCESS] Model yüklendi. Süre: ${Date.now() - loadStartTime}ms`);
  } catch (err: any) {
    console.error(`[ERROR] Model yükleme başarısız: ${err.message}`);
    process.exit(1);
  }

  console.log("[STEP 4] Context oluşturuluyor...");
  let context;
  try {
    context = await model.createContext({
      contextSize: 2048
    });
    console.log("[SUCCESS] Context oluşturuldu.");
  } catch (err: any) {
    console.error(`[ERROR] Context oluşturma başarısız: ${err.message}`);
    process.exit(1);
  }

  console.log("[STEP 5] Chat Session başlatılıyor ve prompt gönderiliyor...");
  const session = new LlamaChatSession({
    contextSequence: context.getSequence()
  });

  const prompt = "Selam! Sen kimsin ve hangi modeli kullanıyorsun? Kısa cevap ver.";
  console.log(`[PROMPT]: ${prompt}`);
  
  const inferenceStartTime = Date.now();
  try {
    const response = await session.prompt(prompt);
    console.log("\n[RESPONSE]:");
    console.log("-----------------------------------------");
    console.log(response);
    console.log("-----------------------------------------");
    console.log(`\n[SUCCESS] Cevap alındı. Süre: ${Date.now() - inferenceStartTime}ms`);
  } catch (err: any) {
    console.error(`[ERROR] Inference başarısız: ${err.message}`);
    process.exit(1);
  }

  console.log("\n--- TEST BAŞARIYLA TAMAMLANDI ---");
  console.log("Aillame Faz 1: GGUF Runtime Doğrulandı.\n");
}

main().catch((err) => {
  console.error("[CRITICAL ERROR]", err);
  process.exit(1);
});
