async function testApi() {
    try {
        console.log('📡 API Testi Başlatılıyor (localhost:3000)...');
        const response = await fetch('http://localhost:3000/api/core/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: 'Aillame nedir?', maxTokens: 50 })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ API Hatası:', error);
            return;
        }

        const data = await response.json();
        console.log('✅ API Yanıtı:', data.response);
    } catch (error) {
        console.error('❌ Bağlantı Hatası (Sunucu açık mı?):', error);
    }
}

testApi();
