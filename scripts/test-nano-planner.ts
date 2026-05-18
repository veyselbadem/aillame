import { NanoPlannerService } from '../src/core/nano/nano-planner.service';
import { NanoPlanBuilder } from '../src/core/nano/contracts/nano-plan-builder';

async function testNanoPlanner() {
    console.log("--- AILLAME NANO PLANNER TEST ---");

    const scenarios = [
        "Merhaba, kendini tanıt.",
        "Hukuk sitem için SEO uyumlu makale yaz.",
        "HTML CSS ile hero bölümü yap.",
        "Bir kapak görseli üret.",
        "Bu görsel hukuk siteme uygun mu?",
        "Gemma 4 ile cevap ver.",
        "Yeni model indir ve aktif yap."
    ];

    for (const msg of scenarios) {
        const decision = await NanoPlannerService.plan(msg);
        const sanitized = NanoPlanBuilder.sanitizeForClient(decision);
        
        console.log(`\nInput: "${msg}"`);
        console.log(`- Intent: ${sanitized.intent}`);
        console.log(`- Capabilities: ${sanitized.selectedCapabilities.join(', ')}`);
        console.log(`- Selected Models: ${sanitized.selectedModels.join(', ')}`);
        console.log(`- Needs Approval: ${sanitized.plan.needsUserApproval}`);
        console.log(`- Degraded: ${sanitized.degraded}`);
        if (sanitized.warnings.length > 0) {
            console.log(`- Warnings: ${sanitized.warnings.length}`);
        }
    }
}

testNanoPlanner().catch(console.error);
