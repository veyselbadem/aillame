/**
 * Aillame Nano Feedback to Training Export (Post-Beta Phase 6)
 */

import fs from 'fs';
import path from 'path';

const FEEDBACK_DIR = path.join(process.cwd(), 'data/nano/feedback');
const EXPORT_DIR = path.join(process.cwd(), 'data/nano/cleaned');

async function exportApprovedFeedback() {
  console.log("Exporting approved feedback candidates...");
  
  if (!fs.existsSync(FEEDBACK_DIR)) {
    console.log("No feedback directory found.");
    return;
  }

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const feedbackFiles = fs.readdirSync(FEEDBACK_DIR).filter(f => f.endsWith('.jsonl'));
  let exportedCount = 0;

  for (const file of feedbackFiles) {
    const content = fs.readFileSync(path.join(FEEDBACK_DIR, file), 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const approvedLines = [];

    for (const line of lines) {
      const record = JSON.parse(line);
      // Only export approved records
      if (record.metadata?.reviewStatus === 'approved') {
        approvedLines.push(JSON.stringify({
          id: `exported-${record.id}`,
          type: "instruction",
          instruction: record.instruction,
          expectedOutput: record.expectedOutput,
          mode: record.mode || "general",
          intent: record.intent || "conversation",
          projectId: record.projectId,
          metadata: {
            ...record.metadata,
            source: "feedback-export",
            exportedAt: Date.now()
          }
        }));
        exportedCount++;
      }
    }

    if (approvedLines.length > 0) {
      const exportPath = path.join(EXPORT_DIR, `feedback-export-${Date.now()}.jsonl`);
      fs.writeFileSync(exportPath, approvedLines.join('\n') + '\n');
    }
  }

  console.log(`Exported ${exportedCount} approved candidates.`);
}

exportApprovedFeedback();
