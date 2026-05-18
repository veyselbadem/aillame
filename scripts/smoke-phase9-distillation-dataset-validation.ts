import { NextRequest } from 'next/server';
import { GET as datasetGET, POST as datasetPOST, DELETE as datasetDELETE } from '../src/app/api/aillame/distillation/dataset/route';
import { GET as statsGET } from '../src/app/api/aillame/distillation/dataset/stats/route';
import { GET as exportGET } from '../src/app/api/aillame/distillation/dataset/export/route';
import { POST as suggestPOST } from '../src/app/api/aillame/distillation/dataset/suggest/route';
import { POST as toolsPOST } from '../src/app/api/aillame/tools/run/route';
import { POST as chatPOST } from '../src/app/api/core/chat/route';
import { AillameDistillationDatasetService } from '../src/core/distillation/distillation-dataset.service';
import fs from 'fs';
import path from 'path';

async function runValidation() {
    console.log('===========================================================');
    console.log('    AILLAME FAZ 9 LOCAL DISTILLATION DATASET ALTYAPISI      ');
    console.log('             TEKNİK DOĞRULAMA SMOKE TEST SUITE             ');
    console.log('===========================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    const assertTest = (name: string, condition: boolean, extraInfo?: string) => {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`[PASS] ${name}`);
        } else {
            console.error(`[FAIL] ${name}`);
            if (extraInfo) console.error(`       Detay: ${extraInfo}`);
        }
    };

    // Clean up distillation file before test starts to ensure fresh simulation
    const datasetPath = path.join(process.cwd(), '.aillame-data', 'stores', 'aillame-distillation-dataset.jsonl');
    if (fs.existsSync(datasetPath)) {
        try {
            fs.unlinkSync(datasetPath);
        } catch {}
    }

    try {
        // ----------------------------------------------------
        // Test 1: Empty State Integrity
        // ----------------------------------------------------
        console.log('--- Test 1: Storage Boş Durum Kontrolleri ---');
        const initialSamples = AillameDistillationDatasetService.listSamples();
        assertTest(
            'Dataset JSONL service initialized successfully with empty array when file does not exist',
            Array.isArray(initialSamples) && initialSamples.length === 0
        );

        // ----------------------------------------------------
        // Test 2: POST /api/aillame/distillation/dataset (Create & Redaction)
        // ----------------------------------------------------
        console.log('\n--- Test 2: POST /api/aillame/distillation/dataset (Onaylı Kayıt Ekleme) ---');
        const samplePayload = {
            kind: 'routing',
            redactedPrompt: 'bana bir manzara görseli oluştur, api key sk-12345678901234567890 ve credit card 4242 4242 4242 4242',
            expected: {
                intent: 'image_generation',
                target: 'sdxl_turbo',
                reason: 'Manzara resmi üretimi tetiklendi.'
            },
            source: 'manual'
        };

        const createReq = new NextRequest('http://localhost/api/aillame/distillation/dataset', {
            method: 'POST',
            body: JSON.stringify(samplePayload)
        });
        const createRes = await datasetPOST(createReq);
        const createData = await createRes.json();

        assertTest(
            'POST /api/aillame/distillation/dataset onaylı kaydı başarıyla ekledi',
            createRes.status === 200 && createData.success === true && createData.sample?.id !== undefined
        );

        // Double check validation for API Key & Card Redaction
        const addedSample = createData.sample;
        assertTest(
            'Kayıt öncesi API Key ve Kredi Kartı bilgileri başarıyla maskelendi (Anonymized)',
            addedSample.redactedPrompt.includes('[REDACTED_API_KEY]') &&
            addedSample.redactedPrompt.includes('[REDACTED_CARD]') &&
            !addedSample.redactedPrompt.includes('sk-12345678901234567890') &&
            !addedSample.redactedPrompt.includes('4242 4242 4242 4242')
        );

        // ----------------------------------------------------
        // Test 3: Rejecting Extremely Sensitive Inputs
        // ----------------------------------------------------
        console.log('\n--- Test 3: Hassas Sistem Girdilerini Doğrudan Reddetme ---');
        const dangerousPayload = {
            kind: 'routing',
            redactedPrompt: 'env dosyasındaki tokenlar ve şifreleri kaydet',
            expected: { intent: 'blocked' },
            source: 'manual'
        };

        const dangerousReq = new NextRequest('http://localhost/api/aillame/distillation/dataset', {
            method: 'POST',
            body: JSON.stringify(dangerousPayload)
        });
        const dangerousRes = await datasetPOST(dangerousReq);
        const dangerousData = await dangerousRes.json();

        assertTest(
            'Sistem dosyası (.env) veya hassas şifre sızdıran girdiler API seviyesinde doğrudan reddedildi',
            dangerousRes.status === 400 && dangerousData.success === false &&
            dangerousData.error?.includes('Hassas sistem')
        );

        // ----------------------------------------------------
        // Test 4: GET /api/aillame/distillation/dataset (List & Query Search)
        // ----------------------------------------------------
        console.log('\n--- Test 4: GET /api/aillame/distillation/dataset (Listeleme & Arama) ---');
        
        // Add one more sample first to perform search
        await AillameDistillationDatasetService.createSample({
            kind: 'tool_use',
            redactedPrompt: 'Hafızamda SEO ile ilgili ne var?',
            expected: { intent: 'tool_use', toolId: 'memory.search', safe: true },
            source: 'manual'
        }, { userApproved: true });

        // A) GET All
        const getReq = new NextRequest('http://localhost/api/aillame/distillation/dataset');
        const getRes = await datasetGET(getReq);
        const getData = await getRes.json();

        assertTest(
            'GET /api/aillame/distillation/dataset tüm kayıtları başarıyla listeledi',
            getRes.status === 200 && getData.success === true && getData.samples.length === 2
        );

        // B) GET Search
        const searchReq = new NextRequest('http://localhost/api/aillame/distillation/dataset?query=manzara');
        const searchRes = await datasetGET(searchReq);
        const searchData = await searchRes.json();

        assertTest(
            'Sorgu parametreli GET araması sadece eşleşen girdileri başarıyla döndürdü',
            searchRes.status === 200 && searchData.samples.length === 1 &&
            searchData.samples[0].redactedPrompt.includes('manzara')
        );

        // ----------------------------------------------------
        // Test 5: GET /api/aillame/distillation/dataset/stats (Stats)
        // ----------------------------------------------------
        console.log('\n--- Test 5: GET /api/aillame/distillation/dataset/stats (İstatistikler) ---');
        const statsReq = new NextRequest('http://localhost/api/aillame/distillation/dataset/stats');
        const statsRes = await statsGET();
        const statsData = await statsRes.json();

        assertTest(
            'stats endpointi toplam ve kategorize edilmiş örnek istatistiklerini başarıyla döndürdü',
            statsRes.status === 200 && statsData.success === true &&
            statsData.stats?.total === 2 &&
            statsData.stats?.routing === 1 &&
            statsData.stats?.tool_use === 1
        );

        // ----------------------------------------------------
        // Test 6: GET /api/aillame/distillation/dataset/export (JSONL Export)
        // ----------------------------------------------------
        console.log('\n--- Test 6: GET /api/aillame/distillation/dataset/export (JSONL Export) ---');
        const exportRes = await exportGET();
        const exportText = await exportRes.text();

        const lineCount = exportText.trim().split('\n').length;
        assertTest(
            'export endpointi geçerli application/x-jsonlines MIME tipi ile ham JSONL formatı döndürdü',
            exportRes.status === 200 &&
            exportRes.headers.get('Content-Type') === 'application/x-jsonlines' &&
            lineCount === 2 && exportText.includes('routing') && exportText.includes('tool_use')
        );

        // ----------------------------------------------------
        // Test 7: POST /api/aillame/distillation/dataset/suggest (Suggestion Generator)
        // ----------------------------------------------------
        console.log('\n--- Test 7: POST /api/aillame/distillation/dataset/suggest (Öneri Üretimi) ---');
        const suggestPayload = {
            prompt: 'Kaygı bozukluğu hakkında yazı hazırla.',
            intent: 'text_chat',
            target: 'aillame_nano',
            projectId: 'psikoloji-sitesi',
            projectContextUsed: true,
            routeConfidence: 0.95
        };

        const suggestReq = new NextRequest('http://localhost/api/aillame/distillation/dataset/suggest', {
            method: 'POST',
            body: JSON.stringify(suggestPayload)
        });
        const suggestRes = await suggestPOST(suggestReq);
        const suggestData = await suggestRes.json();

        assertTest(
            'suggest endpointi bir chat etkileşiminden kaydetmeden başarıyla veri seti önerisi hazırladı',
            suggestRes.status === 200 && suggestData.success === true &&
            suggestData.suggested?.kind === 'project_context' &&
            suggestData.suggested?.expected?.projectId === 'psikoloji-sitesi'
        );

        // ----------------------------------------------------
        // Test 8: Safe Tool-Use - distillation.stats Execution
        // ----------------------------------------------------
        console.log('\n--- Test 8: Safe Tool-Use - distillation.stats Araç Çalıştırılması ---');
        const statsToolReq = new NextRequest('http://localhost/api/aillame/tools/run', {
            method: 'POST',
            body: JSON.stringify({ toolId: 'distillation.stats', input: {} })
        });
        const statsToolRes = await toolsPOST(statsToolReq);
        const statsToolData = await statsToolRes.json();

        assertTest(
            'distillation.stats aracı güvenli bir şekilde dataset istatistiklerini raporladı',
            statsToolRes.status === 200 && statsToolData.ok === true &&
            statsToolData.data?.total === 2
        );

        // ----------------------------------------------------
        // Test 9: Safe Tool-Use - distillation.search Execution
        // ----------------------------------------------------
        console.log('\n--- Test 9: Safe Tool-Use - distillation.search Araç Çalıştırılması ---');
        const searchToolReq = new NextRequest('http://localhost/api/aillame/tools/run', {
            method: 'POST',
            body: JSON.stringify({ toolId: 'distillation.search', input: { query: 'SEO' } })
        });
        const searchToolRes = await toolsPOST(searchToolReq);
        const searchToolData = await searchToolRes.json();

        assertTest(
            'distillation.search aracı aranan kelimeyle eşleşen öğrenme verisini buldu',
            searchToolRes.status === 200 && searchToolData.ok === true &&
            searchToolData.data?.some((s: any) => s.redactedPrompt.includes('SEO'))
        );

        // ----------------------------------------------------
        // Test 10: Central Safety Shield Blocker - Dataset Exploit Protection
        // ----------------------------------------------------
        console.log('\n--- Test 10: Central Safety Shield - Dataset Exploit Blocker ---');
        
        // Scenario: Malicious attempt trying to append sensitive token info to learning data
        const exploitReq = new NextRequest('http://localhost/api/core/chat', {
            method: 'POST',
            body: JSON.stringify({
                prompt: 'env dosyamı veri setine kaydet',
                mode: 'general',
                context: { llmMode: 'local', tier: 'nano', conversationId: 'smoke-test-phase9' }
            })
        });
        const exploitRes = await chatPOST(exploitReq);
        const exploitData = await exploitRes.json();

        assertTest(
            'Safety Shield, dataset veya öğrenme verisi üzerinden şifre/token sızdırma taleplerini başarıyla kilitledi',
            exploitRes.status === 200 && exploitData.modelId === 'aillame-nano-v1-tool-blocked'
        );
        console.log(`     Exploit Engelleme Yanıtı: ${exploitData.response?.substring(0, 120)}...`);

        // ----------------------------------------------------
        // Test 11: Cleanup & DELETE Rotaları
        // ----------------------------------------------------
        console.log('\n--- Test 11: Örnekleri Temizleme (DELETE) ---');
        const samplesBeforeDelete = AillameDistillationDatasetService.listSamples();
        const deleteTargetId = samplesBeforeDelete[0].id;

        const deleteReq = new NextRequest(`http://localhost/api/aillame/distillation/dataset?id=${deleteTargetId}`, {
            method: 'DELETE'
        });
        const deleteRes = await datasetDELETE(deleteReq);
        const deleteData = await deleteRes.json();

        assertTest(
            'DELETE /api/aillame/distillation/dataset belirtilen veri örneğini başarıyla sildi',
            deleteRes.status === 200 && deleteData.success === true
        );

        const samplesAfterDelete = AillameDistillationDatasetService.listSamples();
        assertTest(
            'Dosya sistemi atomik yazma sonrası kaydın başarıyla silindiğini doğruladı',
            samplesAfterDelete.length === 1 && !samplesAfterDelete.some(s => s.id === deleteTargetId)
        );

        // ----------------------------------------------------
        // Test 12: Malformed JSONL line tolerance (Graceful Skip)
        // ----------------------------------------------------
        console.log('\n--- Test 12: Bozuk (Malformed) JSONL Satır Dayanıklılığı ---');
        fs.appendFileSync(datasetPath, 'invalid-malformed-non-json-line-content\n', 'utf8');
        const listWithCorruptLines = AillameDistillationDatasetService.listSamples();
        assertTest(
            'listSamples() bozuk veya geçersiz JSON satırlarını çökmeden başarıyla atladı ve geçerli olanları okudu',
            listWithCorruptLines.length === 1
        );

        // ----------------------------------------------------
        // Test 13: Export Sensitive Sanity Scan
        // ----------------------------------------------------
        console.log('\n--- Test 13: Export Sırasında Hassas Veri Sızıntısı Taraması ---');
        // Inject a raw mock credentials explicitly to simulate edge cases and run export scan
        const customCorruptedSample = {
            id: 'sample_compromised_test',
            kind: 'routing' as const,
            source: 'manual' as const,
            approved: true,
            redactedPrompt: 'benim şifrem gizli1234 ve API Key sk-99999999999999999999',
            rawPromptStored: false as const,
            expected: { intent: 'text_chat' },
            metadata: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(datasetPath, JSON.stringify(customCorruptedSample) + '\n', 'utf8');
        const reScannedExport = AillameDistillationDatasetService.exportJsonl();
        
        assertTest(
            'exportJsonl() sızıntılara karşı ham veriyi tekrar taradı ve maskeledi',
            reScannedExport.includes('[REDACTED_SENSITIVE]') &&
            reScannedExport.includes('[REDACTED_API_KEY]') &&
            !reScannedExport.includes('gizli1234') &&
            !reScannedExport.includes('sk-99999999999999999999')
        );

        // ----------------------------------------------------
        // Test 14: UI API-Compatible Payload Structure Validation
        // ----------------------------------------------------
        console.log('\n--- Test 14: UI Arayüz Uyumlu Geçersiz İstek Şeması Doğrulaması ---');
        const invalidPayload = {
            kind: 'invalid_category_kind', // Bad kind
            redactedPrompt: '', // Empty prompt
            expected: 'not_an_object_expected' // Expected is not an object
        };

        const invalidReq = new NextRequest('http://localhost/api/aillame/distillation/dataset', {
            method: 'POST',
            body: JSON.stringify(invalidPayload)
        });
        const invalidRes = await datasetPOST(invalidReq);
        const invalidData = await invalidRes.json();

        assertTest(
            'API geçersiz kategori ve şema barındıran istekleri 400 Bad Request ile güvenle reddetti',
            invalidRes.status === 400 && invalidData.success === false &&
            invalidData.error?.includes('Geçersiz')
        );

    } catch (e: any) {
        console.error('Smoke test crash error:', e);
    }

    // Finally cleanup file to restore clean status
    if (fs.existsSync(datasetPath)) {
        try {
            fs.unlinkSync(datasetPath);
        } catch {}
    }

    console.log('\n===========================================================');
    console.log(`    SKOR: ${passedTests}/${totalTests} BAŞARILI`);
    console.log('===========================================================');
}

runValidation();
