import { buildDynamicContext, injectMemories } from './context-manager';

// Test 1: Kısa geçmiş — hepsi seçilmeli
const shortHistory = [
  { role: 'user' as const, content: 'Merhaba' },
  { role: 'assistant' as const, content: 'Nasıl yardımcı olabilirim?' },
];
const r1 = buildDynamicContext(shortHistory);
console.assert(r1.messages.length === 2, 'Test 1 başarısız');

// Test 2: Uzun geçmiş — bütçe aşılınca kırpılmalı
const longHistory = Array.from({ length: 20 }, (_, i) => ({
  role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
  content: 'A'.repeat(300),
}));
const r2 = buildDynamicContext(longHistory, [], { maxChars: 2000 });
console.assert(r2.droppedCount > 0, 'Test 2 başarısız');

// Test 3: Hafıza enjeksiyonu
const r3 = injectMemories(r1, ['Kullanıcı daha önce Python sordu']);
console.assert(r3.memoryInjected === true, 'Test 3 başarısız');
console.assert(r3.messages[0].role === 'system', 'Test 3 başarısız');

console.log('✅ Context Manager testleri geçti');
