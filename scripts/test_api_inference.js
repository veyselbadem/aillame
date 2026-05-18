
async function testInference() {
    console.log("--- AILLAME GPU INFERENCE TEST ---");
    const port = 3000;
    const url = `http://127.0.0.1:${port}/api/aillame/chat`;
    const apiKey = 'test-key-placeholder'; // I need to find the real one or bypass

    const prompts = [
        "Merhaba, tek cümleyle kendini tanıt.",
        "HTML'de basit bir buton kodu yaz.",
        "Türkçe karakter testi: ç, ğ, ı, İ, ö, ş, ü"
    ];

    for (const prompt of prompts) {
        console.log(`\nTesting: "${prompt}"`);
        const start = Date.now();
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-aillame-api-key': 'ail_dev_test'
                },
                body: JSON.stringify({
                    message: prompt,
                    projectId: 'aillame-admin',
                    modelId: 'qwen2-5-0-5b-instruct-q4-k-m'
                })
            });
            const data = await response.json();
            const end = Date.now();
            console.log(`Success: ${data.success}`);
            console.log(`Answer: ${data.answer?.substring(0, 100)}...`);
            console.log(`Latency: ${end - start}ms`);
            console.log(`Meta:`, data.meta);
        } catch (err) {
            console.error(`Error: ${err.message}`);
        }
    }
}

testInference();
