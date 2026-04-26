const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
const queuePath = path.resolve('memory-write-queue-store.json');
const orig = fs.readFileSync(queuePath, 'utf8');
const original = JSON.parse(orig);
const existingId = original[0].id;
const highRecord = {
  id: 'test-high-risk-ready',
  sourcePreviewId: 'test-high-preview',
  sourceCandidateId: 'test-high-candidate',
  sourceFeedbackId: 'test-high-feedback',
  targetMemoryScope: 'task',
  targetMode: 'economy',
  title: 'High risk test',
  summary: 'High risk test summary',
  keywords: ['high', 'risk'],
  riskLevel: 'high',
  confidenceScore: 0.1,
  status: 'ready_for_memory_write',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
const base = 'http://127.0.0.1:3000';
const doFetch = async (path, opts) => {
  const res = await fetch(base + path, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    body = text;
  }
  return { status: res.status, body };
};
const readQueue = () => JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const writeQueue = (records) => fs.writeFileSync(queuePath, JSON.stringify(records, null, 2), 'utf8');
const setStatus = (status, risk = 'medium') => {
  const q = readQueue();
  const idx = q.findIndex((r) => r.id === existingId);
  if (idx < 0) throw new Error('missing existing id');
  q[idx].status = status;
  q[idx].riskLevel = risk;
  q[idx].updatedAt = Date.now();
  writeQueue(q);
};
(async () => {
  try {
    const results = [];
    const currentQueue = readQueue();
    if (!currentQueue.some((r) => r.id === highRecord.id)) {
      currentQueue.push(highRecord);
      writeQueue(currentQueue);
    }

    results.push({ name: 'GET /api/memory-cards', result: await doFetch('/api/memory-cards', { method: 'GET' }) });
    setStatus('pending_write');
    results.push({ name: 'POST /api/memory-cards pending_write', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: existingId }) }) });
    setStatus('ready_for_memory_write');
    results.push({ name: 'POST /api/memory-cards ready_for_memory_write', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: existingId }) }) });
    results.push({ name: 'POST /api/memory-cards duplicate same queueId', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: existingId }) }) });
    setStatus('rejected');
    results.push({ name: 'POST /api/memory-cards rejected', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: existingId }) }) });
    setStatus('archived');
    results.push({ name: 'POST /api/memory-cards archived', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: existingId }) }) });
    results.push({ name: 'POST /api/memory-cards missing queueId', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }) });
    results.push({ name: 'POST /api/memory-cards unknown queueId', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: 'unknown-queue-id' }) }) });
    results.push({ name: 'POST /api/memory-cards high risk ready_for_memory_write', result: await doFetch('/api/memory-cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId: highRecord.id }) }) });
    const cards = JSON.parse(fs.readFileSync('memory-cards-store.json', 'utf8'));
    const logs = JSON.parse(fs.readFileSync('memory-write-log.json', 'utf8'));
    const queueAfter = readQueue();
    writeQueue(original);
    results.push({ name: 'cards', count: cards.length, items: cards });
    results.push({ name: 'logs', count: logs.length, items: logs.slice(-5) });
    results.push({ name: 'queueAfter', queueAfter });
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    writeQueue(original);
    console.error(error);
    process.exit(1);
  }
})();
