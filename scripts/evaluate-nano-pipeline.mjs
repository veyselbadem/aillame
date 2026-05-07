/**
 * Aillame Nano Evaluation Pipeline Runner (Post-Beta Phase 6)
 */

import fs from 'fs';
import path from 'path';

const EVAL_ROOT = path.join(process.cwd(), 'data/nano/eval');

async function runEvaluation() {
  console.log("Starting Nano Evaluation Pipeline...");
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    byProject: {},
    byEvalType: {},
    safetyFailures: 0,
    jsonFailures: 0
  };

  const files = getAllJsonlFiles(EVAL_ROOT);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        results.total++;
        
        const type = record.type || 'unknown';
        results.byEvalType[type] = (results.byEvalType[type] || 0) + 1;
        
        if (record.projectId) {
          results.byProject[record.projectId] = (results.byProject[record.projectId] || 0) + 1;
        }

        // Simulation logic: In foundation phase, we just validate the structure and expectedDecision
        const validation = validateEvalRecord(record);
        if (validation.ok) {
          results.passed++;
        } else {
          results.failed++;
          if (type === 'safety-fallback') results.safetyFailures++;
          if (type === 'json-output') results.jsonFailures++;
          console.error(`[FAIL] ${record.id}: ${validation.reason}`);
        }

      } catch (err) {
        results.failed++;
        console.error(`Error parsing line in ${file}: ${err.message}`);
      }
    }
  }

  console.log("\n--- Evaluation Report ---");
  console.log(JSON.stringify(results, null, 2));
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

function getAllJsonlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsonlFiles(file));
    } else if (file.endsWith('.jsonl')) {
      results.push(file);
    }
  });
  return results;
}

function validateEvalRecord(record) {
  if (!record.id) return { ok: false, reason: "Missing ID" };
  if (!record.type) return { ok: false, reason: "Missing Type" };
  if (!record.instruction) return { ok: false, reason: "Missing Instruction" };
  
  if (record.type === 'safety-fallback') {
    if (!record.expectedDecision || record.expectedDecision.autonomousActionsEnabled === true) {
        return { ok: false, reason: "Safety eval must expect autonomousActionsEnabled: false" };
    }
  }
  
  if (record.type === 'json-output') {
    if (!record.scoringRubric || record.scoringRubric.validJson !== true) {
        return { ok: false, reason: "JSON eval must require validJson: true" };
    }
  }

  // Check for mojibake patterns (dummy check for smoke)
  const mojibakePatterns = ['Ã¼', 'ÄŸ', 'ÅŸ', 'Ä±', 'Ã¶', 'Ã§'];
  const text = JSON.stringify(record);
  for (const p of mojibakePatterns) {
    if (text.includes(p)) return { ok: false, reason: `Mojibake detected: ${p}` };
  }

  return { ok: true };
}

runEvaluation();
