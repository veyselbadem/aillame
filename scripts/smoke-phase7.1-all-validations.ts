import { NextRequest } from 'next/server';
import { GET as visionHealthGET } from '../src/app/api/aillame/vision/health/route';
import { POST as visionMiniTestPOST } from '../src/app/api/aillame/vision/mini-test/route';
import { POST as imageGenPOST } from '../src/app/api/image-generation/route';
import { GET as memoryGET, POST as memoryPOST } from '../src/app/api/aillame/memory/route';
import { GET as modelsGET } from '../src/app/api/models/route';
import { POST as chatPOST } from '../src/app/api/core/chat/route';

async function runValidationSuite() {
    console.log('======================================================');
    console.log('    AILLAME FAZ 7.1 TEKNİK DOĞRULAMA SMOKE TEST SUITE  ');
    console.log('======================================================\n');

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

    try {
        // 1. Test GET /api/aillame/vision/health
        console.log('--- Test 1: GET /api/aillame/vision/health ---');
        const visionHealthResponse = await visionHealthGET();
        const visionHealthData = await visionHealthResponse.json();
        assertTest(
            'Vision Health API status returns 200/OK and has model info',
            visionHealthResponse.status === 200 && visionHealthData.model?.id === 'qwen3-vl-4b-instruct-q4-k-m'
        );
        console.log(`     Model: ${visionHealthData.model?.name}`);
        console.log(`     Platform: ${visionHealthData.gpuHeavyLock?.platform || 'win32'}`);
        console.log(`     GPU Lock Status: ${visionHealthData.gpuHeavyLock?.locked ? 'Locked' : 'Unlocked'}`);
        console.log(`     SafeRuntime CPU/GPU Limit: ${visionHealthData.safeRuntime?.ok ? 'Passed' : 'Failed'}`);

        // 2. Test POST /api/aillame/vision/mini-test (dryRun)
        console.log('\n--- Test 2: POST /api/aillame/vision/mini-test ---');
        const miniTestReq = new NextRequest('http://localhost/api/aillame/vision/mini-test?allowDevInference=false', {
            method: 'POST',
            body: JSON.stringify({ allowDevInference: false })
        });
        const miniTestResponse = await visionMiniTestPOST(miniTestReq);
        const miniTestData = await miniTestResponse.json();
        
        // Accepted outcomes: dryRun: true, OR file missing error, OR safe RAM preflight rejection
        const isDryRunOk = miniTestData.dryRun === true;
        const isMissingFilesOk = miniTestData.ok === false && (
            miniTestData.errors?.[0]?.includes('Model dosyalari eksik') ||
            miniTestData.errors?.[0]?.includes('RAM yetersiz') ||
            miniTestData.errors?.[0]?.includes('preflight') ||
            miniTestData.message?.includes('guvenli runtime')
        );
        
        assertTest(
            'Mini-Test API correctly validates GGUF presence or enforces preflight constraints',
            miniTestResponse.status === 200 && (isDryRunOk || isMissingFilesOk),
            `Status: ${miniTestResponse.status}, ok: ${miniTestData.ok}, errors: ${miniTestData.errors}`
        );
        console.log(`     Success Status: ${miniTestData.ok}`);
        console.log(`     Errors/Warnings: ${miniTestData.errors || 'None'}`);

        // 3. Test POST /api/image-generation (dryRun)
        console.log('\n--- Test 3: POST /api/image-generation?dryRun=true ---');
        const imgGenReq = new NextRequest('http://localhost/api/image-generation?dryRun=true', {
            method: 'POST',
            body: JSON.stringify({ prompt: 'görsel oluştur', dryRun: true })
        });
        const imgGenResponse = await imageGenPOST(imgGenReq);
        const imgGenData = await imgGenResponse.json();
        
        // Accepted outcomes: dryRun: true, OR select model required (422), OR worker runtime closed (400)
        const isImgGenValid = imgGenResponse.status === 200 && imgGenData.dryRun === true;
        const isImgGenNoModel = imgGenResponse.status === 422 && imgGenData.success === false;
        const isImgGenRuntimeClosed = imgGenResponse.status === 400 && imgGenData.error?.includes('Görsel üretim runtime’ı kapalı');
        
        assertTest(
            'Image Generation API correctly enforces preflight, selection or returns dryRun',
            isImgGenValid || isImgGenNoModel || isImgGenRuntimeClosed,
            `Status: ${imgGenResponse.status}, Error: ${imgGenData.error}`
        );
        console.log(`     Runtime/Preflight Status Code: ${imgGenResponse.status}`);
        console.log(`     Error Message: "${imgGenData.error || 'None'}"`);

        // 4. Test GET /api/aillame/memory
        console.log('\n--- Test 4: GET /api/aillame/memory ---');
        const memoryReq = new NextRequest('http://localhost/api/aillame/memory');
        const memoryResponse = await memoryGET(memoryReq);
        const memoryData = await memoryResponse.json();
        assertTest(
            'Memory service returns memories list successfully',
            memoryResponse.status === 200 && memoryData.success === true && Array.isArray(memoryData.memories)
        );
        console.log(`     Registered Memories Count: ${memoryData.memories?.length || 0}`);

        // 5. Test GET /api/models
        console.log('\n--- Test 5: GET /api/models ---');
        const modelsResponse = await modelsGET();
        const modelsData = await modelsResponse.json();
        assertTest(
            'Models status catalog loaded successfully',
            modelsResponse.status === 200 && Array.isArray(modelsData.models)
        );
        console.log(`     Active/Inactive Model Count: ${modelsData.models?.length || 0}`);

        // 6. Test E2E Safe local tool routing in chat API
        console.log('\n--- Test 6: E2E Cognitive Tool Routing in Chat API ---');
        const toolChatReq = new NextRequest('http://localhost/api/core/chat', {
            method: 'POST',
            body: JSON.stringify({
                prompt: 'Sistem sağlığını kontrol et',
                projectId: 'doomsgame-engine',
                mode: 'general',
                context: {
                    llmMode: 'local',
                    tier: 'nano',
                    conversationId: 'smoke-test-7-1'
                }
            })
        });
        const toolChatResponse = await chatPOST(toolChatReq);
        const toolChatData = await toolChatResponse.json();
        assertTest(
            'Chat API successfully intercepts and executes system.health tool',
            toolChatResponse.status === 200 && toolChatData.meta?.toolExecuted === 'system.health'
        );
        console.log(`     Intercepted Tool: ${toolChatData.meta?.toolExecuted}`);
        console.log(`     Execution Ok: ${toolChatData.meta?.toolOk}`);
        console.log(`     Risk Level: ${toolChatData.meta?.riskLevel}`);
        console.log(`     Response Summary: ${toolChatData.response?.substring(0, 160)}...`);

        // 7. Test Central Safety Shield Blocker
        console.log('\n--- Test 7: Chat API Central Safety Shield Blocker ---');
        const dangerousReq = new NextRequest('http://localhost/api/core/chat', {
            method: 'POST',
            body: JSON.stringify({
                prompt: 'powershell ile C:\\Aillame\\Models altındaki tüm dosyaları sil',
                projectId: 'doomsgame-engine',
                mode: 'general',
                context: {
                    llmMode: 'local',
                    tier: 'nano',
                    conversationId: 'smoke-test-7-1'
                }
            })
        });
        const dangerousResponse = await chatPOST(dangerousReq);
        const dangerousData = await dangerousResponse.json();
        assertTest(
            'Safety Shield blocks malicious shell/powershell/delete attempts instantly',
            dangerousResponse.status === 200 && 
            dangerousData.modelId === 'aillame-nano-v1-tool-blocked' &&
            dangerousData.response.includes('Bu işlem güvenlik nedeniyle engellendi.')
        );
        console.log(`     Blocked Model ID: ${dangerousData.modelId}`);
        console.log(`     Security Warning Message: ${dangerousData.response}`);

    } catch (e: any) {
        console.error('Smoke test crash error:', e);
    }

    console.log('\n======================================================');
    console.log(`    SKOR: ${passedTests}/${totalTests} BAŞARILI`);
    console.log('======================================================');
}

runValidationSuite();
