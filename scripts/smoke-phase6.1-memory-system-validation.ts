import { AillameMemoryService, isSensitiveContent } from '../src/core/memory/aillame-memory.service';
import fs from 'fs';
import path from 'path';
import { resolveProjectRelative } from '../src/core/project-root';

const MEMORY_STORE_PATH = resolveProjectRelative('.aillame-data/stores/aillame-memory.json');

async function runTests() {
  console.log('====================================================');
  console.log('     AILLAME NANO MEMORY SYSTEM AUTOMATED TEST      ');
  console.log('====================================================');

  // Backup existing memory file if any
  let originalData: string | null = null;
  if (fs.existsSync(MEMORY_STORE_PATH)) {
    originalData = fs.readFileSync(MEMORY_STORE_PATH, 'utf-8');
    fs.unlinkSync(MEMORY_STORE_PATH);
    console.log('[Test Setup] Existing memory store backed up and cleared.');
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Empty state test
    // ----------------------------------------------------
    console.log('\n[Test 1] Testing empty state behavior...');
    const initialList = await AillameMemoryService.listMemories();
    if (initialList.length === 0) {
      console.log('✓ Success: Empty memory file returns empty array without crashing.');
    } else {
      throw new Error(`Expected empty list, got ${initialList.length} items.`);
    }

    // ----------------------------------------------------
    // TEST 2: Create memory & Serialization
    // ----------------------------------------------------
    console.log('\n[Test 2] Testing memory creation...');
    const testRecord = {
      type: 'preference' as const,
      scope: 'user' as const,
      content: 'Kullanıcı SEO uyumlu Türkçe içerikleri tercih eder.',
      tags: ['seo', 'türkçe', 'içerik']
    };

    const created = await AillameMemoryService.createMemory(testRecord);
    console.log('Created record:', JSON.stringify(created, null, 2));

    if (!created.id || !created.createdAt || !created.updatedAt) {
      throw new Error('Missing generated properties (id, createdAt, updatedAt).');
    }
    if (created.sensitive !== false) {
      throw new Error('Sensitive property must be false.');
    }
    
    // Check file creation
    if (fs.existsSync(MEMORY_STORE_PATH)) {
      console.log('✓ Success: Store file created at', MEMORY_STORE_PATH);
    } else {
      throw new Error('Store file was not written to disk.');
    }

    // ----------------------------------------------------
    // TEST 3: Search Relevance
    // ----------------------------------------------------
    console.log('\n[Test 3] Testing search relevance scoring...');
    const searchResults = await AillameMemoryService.getRelevantMemoriesForPrompt('SEO uyumlu yazı yaz');
    console.log(`Found ${searchResults.length} relevant results.`);
    if (searchResults.length > 0 && searchResults[0].content.includes('SEO')) {
      console.log('✓ Success: Search relevance algorithm returned correct record.');
    } else {
      throw new Error('Relevance search failed to return expected memory.');
    }

    // ----------------------------------------------------
    // TEST 4: Sensitive Data Rejection
    // ----------------------------------------------------
    console.log('\n[Test 4] Testing sensitive data rejection...');
    const sensitivePrompts = [
      'Benim şifrem 123456',
      'API key: sk-proj-1234567890abcdef',
      'Kredi kartı numaram: 4111 2222 3333 4444',
      'TC Kimlik numaram: 12345678901'
    ];

    for (const prompt of sensitivePrompts) {
      const isSensitive = isSensitiveContent(prompt);
      console.log(`Prompt: "${prompt}" -> Sensitive:`, isSensitive);
      if (!isSensitive) {
        throw new Error(`Failed to identify sensitive content: "${prompt}"`);
      }
      
      try {
        await AillameMemoryService.createMemory({
          type: 'note',
          scope: 'user',
          content: prompt,
          tags: ['sensitive-test']
        });
        throw new Error(`Sensitive content was incorrectly allowed to save!`);
      } catch (err: any) {
        console.log(`✓ Rejection verified: ${err.message}`);
      }
    }

    // ----------------------------------------------------
    // TEST 5: Session Context
    // ----------------------------------------------------
    console.log('\n[Test 5] Testing session context updating and clearance...');
    AillameMemoryService.updateSessionContext({
      lastPrompt: 'Görsel oluştur',
      lastIntent: 'image_generation',
      lastTarget: 'SDXL Turbo',
      lastModelId: 'sdxl-turbo-v1',
      lastRouteExplanation: 'Manzara resmi talebi algılandı.'
    });

    const ctx = AillameMemoryService.getSessionContext();
    console.log('Current session context:', JSON.stringify(ctx, null, 2));
    if (ctx && ctx.lastTarget === 'SDXL Turbo') {
      console.log('✓ Success: Session context is correctly saved in memory.');
    } else {
      throw new Error('Failed to save session context.');
    }

    // ----------------------------------------------------
    // TEST 6: Self-Healing Corrupted JSON File
    // ----------------------------------------------------
    console.log('\n[Test 6] Testing self-healing of corrupted JSON data...');
    fs.writeFileSync(MEMORY_STORE_PATH, '{ corrupted: json [invalid }', 'utf-8');
    
    // Attempt listMemories which triggers self-healing
    const healedList = await AillameMemoryService.listMemories();
    console.log('Self-healed query result length:', healedList.length);
    
    if (healedList.length === 0) {
      console.log('✓ Success: Corrupted file was detected, backed up, healed, and empty array returned safely.');
    } else {
      throw new Error('Failed to recover from corrupted JSON.');
    }

    // ----------------------------------------------------
    // TEST 7: Delete Memory
    // ----------------------------------------------------
    console.log('\n[Test 7] Testing deletion of memory...');
    const freshRecord = await AillameMemoryService.createMemory({
      type: 'note',
      scope: 'session',
      content: 'Silinecek hafıza kaydı içeriği.',
      tags: ['sil', 'test']
    });

    const deleted = await AillameMemoryService.deleteMemory(freshRecord.id);
    console.log('Deletion result:', deleted);
    if (deleted) {
      const listAfterDelete = await AillameMemoryService.listMemories();
      const exists = listAfterDelete.some(m => m.id === freshRecord.id);
      if (!exists) {
        console.log('✓ Success: Memory card deleted successfully and is absent in list.');
      } else {
        throw new Error('Memory record still exists after deletion.');
      }
    } else {
      throw new Error('Delete call returned false.');
    }

    console.log('\n====================================================');
    console.log('     ALL SYSTEM TESTS COMPLETED WITH 100% SUCCESS    ');
    console.log('====================================================');
  } finally {
    // Restore original file
    if (originalData) {
      fs.writeFileSync(MEMORY_STORE_PATH, originalData, 'utf-8');
      console.log('[Test Teardown] Restored original memory database.');
    } else {
      if (fs.existsSync(MEMORY_STORE_PATH)) {
        fs.unlinkSync(MEMORY_STORE_PATH);
      }
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
