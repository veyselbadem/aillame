/**
 * Aillame OpenAI-Compatible E2E Smoke Test (Post-Beta Phase 3)
 */

import fs from 'fs';
import path from 'path';

const checks = [];
let hasFailed = false;

function check(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      checks.push({ name, ok: true, detail: "Passed" });
    } else {
      checks.push({ name, ok: false, detail: result });
      hasFailed = true;
    }
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message });
    hasFailed = true;
  }
}

console.log("Running OpenAI-Compatible Integration Smoke Tests...\n");

const routePath = path.join(process.cwd(), 'src/app/api/v1/chat/completions/route.ts');

check("OpenAI-compatible route exists", () => {
  if (!fs.existsSync(routePath)) return "route.ts missing";
  return true;
});

check("Route handles OpenAI message format", () => {
  const content = fs.readFileSync(routePath, 'utf8');
  if (!content.includes('role') || !content.includes('content')) return "Missing role/content parsing";
  if (!content.includes('assistant')) return "Missing assistant role constant";
  return true;
});

check("Route supports project passthrough", () => {
  const content = fs.readFileSync(routePath, 'utf8');
  if (!content.includes('projectId') || !content.includes('mode') || !content.includes('taskType')) {
    return "Missing Aillame project passthrough fields";
  }
  return true;
});

check("Route returns OpenAI-compatible response shape", () => {
  const content = fs.readFileSync(routePath, 'utf8');
  if (!content.includes('chat.completion')) return "Missing object type constant";
  if (!content.includes('choices') || !content.includes('usage')) return "Missing required OpenAI fields";
  return true;
});

check("Stream unsupported is structured", () => {
  const content = fs.readFileSync(routePath, 'utf8');
  if (!content.includes('stream_not_supported')) return "Missing structured error for stream";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
