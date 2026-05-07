/**
 * Aillame Nano Training Candidate Validator (Post-Beta Phase 6)
 */

import fs from 'fs';
import path from 'path';

const CLEANED_DIR = path.join(process.cwd(), 'data/nano/cleaned');

async function validateCandidates() {
  console.log("Validating training candidates...");
  
  if (!fs.existsSync(CLEANED_DIR)) {
    console.log("No cleaned data directory found.");
    return;
  }

  const files = fs.readdirSync(CLEANED_DIR).filter(f => f.endsWith('.jsonl'));
  let totalValid = 0;
  let totalInvalid = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(CLEANED_DIR, file), 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        const validation = checkCandidate(record);
        if (validation.ok) {
          totalValid++;
        } else {
          totalInvalid++;
          console.error(`[INVALID] ${record.id}: ${validation.reason}`);
        }
      } catch (err) {
        totalInvalid++;
        console.error(`Parse error in ${file}: ${err.message}`);
      }
    }
  }

  console.log(`Summary: ${totalValid} valid, ${totalInvalid} invalid.`);
  if (totalInvalid > 0) {
    process.exit(1);
  }
}

function checkCandidate(record) {
  if (!record.instruction || record.instruction.length < 5) return { ok: false, reason: "Instruction too short or missing" };
  if (!record.expectedOutput || record.expectedOutput.length < 5) return { ok: false, reason: "Expected output too short or missing" };
  
  // Secret detection
  const secretPatterns = [
    /AI[A-Za-z0-9]{20,}/, // Aillame API Key pattern
    /sk-[A-Za-z0-9]{20,}/, // OpenAI pattern
    /ghp_[A-Za-z0-9]{20,}/ // GitHub pattern
  ];

  const text = JSON.stringify(record);
  for (const pattern of secretPatterns) {
    if (pattern.test(text)) return { ok: false, reason: "Potential secret detected in candidate" };
  }

  return { ok: true };
}

validateCandidates();
