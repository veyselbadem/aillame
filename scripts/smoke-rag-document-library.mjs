/**
 * Aillame RAG Document Library Smoke Test (Post-Beta Phase 7)
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

console.log("Running RAG Document Library Smoke Tests...\n");

const docTypesPath = path.join(process.cwd(), 'src/core/memory/documents/document-types.ts');
const ingestionServicePath = path.join(process.cwd(), 'src/core/memory/documents/document-ingestion-service.ts');
const searchServicePath = path.join(process.cwd(), 'src/core/memory/documents/document-search-service.ts');
const chunkerPath = path.join(process.cwd(), 'src/core/memory/documents/document-chunker.ts');

check("Document Library types define RAG attributes", () => {
  if (!fs.existsSync(docTypesPath)) return "document-types.ts missing";
  const content = fs.readFileSync(docTypesPath, 'utf8');
  if (!content.includes('DocumentLibraryEntry')) return "Missing DocumentLibraryEntry";
  if (!content.includes('contentType')) return "Missing contentType";
  if (!content.includes('chunkCount')) return "Missing chunkCount";
  return true;
});

check("Ingestion Service implements safety patterns", () => {
  if (!fs.existsSync(ingestionServicePath)) return "document-ingestion-service.ts missing";
  const content = fs.readFileSync(ingestionServicePath, 'utf8');
  if (!content.includes('SENSITIVE_PATTERNS')) return "Missing sensitive patterns";
  if (!content.includes('secret')) return "Missing secret detection";
  return true;
});

check("Chunker implements text splitting", () => {
  if (!fs.existsSync(chunkerPath)) return "document-chunker.ts missing";
  const content = fs.readFileSync(chunkerPath, 'utf8');
  if (!content.includes('static chunk')) return "Missing chunk method";
  if (!content.includes('maxChars')) return "Missing maxChars option";
  return true;
});

check("Search Service supports project isolation", () => {
  if (!fs.existsSync(searchServicePath)) return "document-search-service.ts missing";
  const content = fs.readFileSync(searchServicePath, 'utf8');
  if (!content.includes('query.projectId')) return "Missing projectId isolation in search";
  if (!content.includes('searchDocuments')) return "Missing searchDocuments method";
  return true;
});

check("API Routes for documents exist", () => {
  const listApi = path.join(process.cwd(), 'src/app/api/admin/documents/route.ts');
  const ingestApi = path.join(process.cwd(), 'src/app/api/admin/documents/ingest/route.ts');
  if (!fs.existsSync(listApi)) return "List API missing";
  if (!fs.existsSync(ingestApi)) return "Ingest API missing";
  return true;
});

check("Admin UI has Document Library visibility", () => {
  const uiPath = path.join(process.cwd(), 'src/app/admin/documents/page.tsx');
  if (!fs.existsSync(uiPath)) return "Document Library UI page missing";
  const content = fs.readFileSync(uiPath, 'utf8');
  if (!content.includes('Document Library')) return "Missing Document Library title";
  return true;
});

console.log(JSON.stringify({ success: !hasFailed, checks }, null, 2));

if (hasFailed) {
  process.exit(1);
}
