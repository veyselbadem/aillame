// [NANO-F6] Final V2 Kalibrasyon Testi
import { inferWithVersionControl } from '../nano-cognitive/service';

async function main() {
    console.log('--- Nano v2 "Büyük Kalibrasyon" Sonrası Final Test ---');
    
    const tests = [
        "React nedir ve neden kullanılır?",
        "Türkiye'nin coğrafi konumu hakkında bilgi ver.",
        "Rust programlama dili neden güvenlidir?"
    ];

    for (const prompt of tests) {
        console.log(`\nSoru: ${prompt}`);
        // Force V2 using high research score in mock taskScore
        const { response, modelId } = await inferWithVersionControl(
            prompt,
            { complexity: 0, research: 2, code: 0, creative: 0 },
            50,
            0.7
        );
        console.log(`Model: ${modelId}`);
        console.log(`Yanıt: ${response}`);
    }
}

main().catch(console.error);
