import { CapabilityRegistry } from '../src/core/models/capability-registry';

async function testRegistry() {
    console.log("--- AILLAME CAPABILITY REGISTRY TEST ---");

    // 1. List all slots
    const slots = CapabilityRegistry.listCapabilitySlots();
    console.log(`Total slots: ${slots.length}`);

    // 2. Test Specific Slot
    const nanoSlot = CapabilityRegistry.getCapabilitySlot('nano.multimodal.core');
    console.log(`Nano Core Status: ${nanoSlot?.status}`);

    // 3. Test Model Resolution
    const bestModel = await CapabilityRegistry.resolveBestModelForCapability('text.general');
    console.log(`Best model for text.general: ${bestModel?.id || 'none'}`);

    // 4. Test Guardrails (Gemma should be false)
    const gemma = { id: 'gemma-4-26b-it-q4-k-m', status: 'archived', unsupportedReason: 'architecture' };
    const selectable = await CapabilityRegistry.isModelSelectableForCapability(gemma as any, 'text.general');
    console.log(`Is Gemma selectable for text.general: ${selectable}`);

    // 5. Test Legacy Fallback
    const legacyModel = await CapabilityRegistry.resolveBestModelForCapability('legacy.test');
    console.log(`Legacy test model: ${legacyModel?.id || 'none'}`);

    console.log("\nSummary:", CapabilityRegistry.getRegistrySummary());
}

testRegistry().catch(console.error);
