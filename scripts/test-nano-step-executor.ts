import { NanoPlannerService } from '../src/core/nano/nano-planner.service';
import { NanoStepExecutorService } from '../src/core/nano/execution/nano-step-executor.service';

async function testNanoExecutor() {
    console.log("--- AILLAME NANO STEP EXECUTOR TEST ---");

    const scenarios = [
        { msg: "Merhaba, kendini tanıt.", attachments: [] },
        { msg: "Hukuk sitem için SEO uyumlu makale yaz.", attachments: [] },
        { msg: "HTML CSS ile hero bölümü yap.", attachments: [] },
        { msg: "Bir kapak görseli üret.", attachments: [] },
        { 
            msg: "Bu görsel hukuk siteme uygun mu?", 
            attachments: [{ type: 'image', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', assetId: 'test-vlm.png' }] 
        },
        { msg: "Gemma 4 ile cevap ver.", attachments: [] },
        { msg: "Yeni model indir ve aktif yap.", attachments: [] }
    ];

    for (const scenario of scenarios) {
        const decision = await NanoPlannerService.plan(scenario.msg);
        const execution = await NanoStepExecutorService.executePlan(decision.plan, { 
            message: scenario.msg, 
            attachments: scenario.attachments 
        });
        
        console.log(`\nInput: "${scenario.msg}"`);
        console.log(`- Intent: ${decision.intent}`);
        console.log(`- Success: ${execution.success}`);
        console.log(`- Blocked: ${execution.blocked}`);
        console.log(`- Degraded: ${execution.degraded}`);
        console.log(`- Steps Executed: ${execution.executionSummary?.stepsTotal}`);
        console.log(`- Succeeded Steps: ${execution.executionSummary?.stepsSucceeded}`);
        if (execution.executionSummary?.fallbackUsed) {
            console.log(`- Fallback Used: Yes`);
        }
        if (!execution.success && execution.errors.length > 0) {
            console.log(`- Error Codes: ${execution.errors.map(e => e.code).join(', ')}`);
        }
    }
}

testNanoExecutor().catch(console.error);
