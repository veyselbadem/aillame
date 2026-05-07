import fs from "node:fs";
import path from "node:path";

const root = path.resolve("data", "nano");
const requiredDirs = [
  "raw",
  "cleaned",
  "instruction",
  "classification",
  "project-aware",
  "safety",
  "eval",
  "feedback",
];

const allowedTypes = new Set([
  "instruction",
  "classification",
  "project-aware",
  "safety-fallback",
  "eval",
  "feedback-candidate",
]);

const safeProjectIdPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const allowedModes = new Set(["general", "education", "code", "economy", "finance", "provider", "game-dev", "classroom"]);
const allowedIntents = new Set([
  "conversation",
  "analysis",
  "planning",
  "coding",
  "math",
  "research",
  "education",
  "creative",
  "image",
  "safety",
  "fallback",
  "unknown",
]);

const mojibakeMarkers = ["Ã", "Ä", "Å", "ð", "�"];
const errors = [];
const warnings = [];
const ids = new Map();

function walkJsonl(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkJsonl(fullPath));
    if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(fullPath);
  }
  return files;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRecord(record, location) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    errors.push(`${location}: record must be a JSON object.`);
    return;
  }

  for (const field of ["id", "type", "instruction", "expectedOutput", "mode", "intent"]) {
    if (!hasText(record[field])) errors.push(`${location}: missing or empty '${field}'.`);
  }

  if (hasText(record.id)) {
    if (ids.has(record.id)) errors.push(`${location}: duplicate id '${record.id}' also seen at ${ids.get(record.id)}.`);
    else ids.set(record.id, location);
  }

  if (hasText(record.type) && !allowedTypes.has(record.type)) {
    errors.push(`${location}: invalid type '${record.type}'.`);
  }

  if (hasText(record.mode) && !allowedModes.has(record.mode)) {
    errors.push(`${location}: invalid mode '${record.mode}'.`);
  }

  if (hasText(record.intent) && !allowedIntents.has(record.intent)) {
    errors.push(`${location}: invalid intent '${record.intent}'.`);
  }

  if (record.type === "project-aware" && !hasText(record.projectId)) {
    errors.push(`${location}: project-aware records require projectId.`);
  }

  if (hasText(record.projectId) && !safeProjectIdPattern.test(record.projectId)) {
    errors.push(`${location}: invalid projectId '${record.projectId}'.`);
  }

  if (record.type === "project-aware") {
    if (!hasText(record.context)) errors.push(`${location}: project-aware records require context.`);
    if (!record.expectedDecision || typeof record.expectedDecision !== "object" || Array.isArray(record.expectedDecision)) {
      errors.push(`${location}: project-aware records require expectedDecision object.`);
    }
  }

  const serialized = JSON.stringify(record);
  const marker = mojibakeMarkers.find((candidate) => serialized.includes(candidate));
  if (marker) {
    errors.push(`${location}: possible broken Turkish encoding marker '${marker}' found.`);
  }
}

for (const dir of requiredDirs) {
  const fullPath = path.join(root, dir);
  if (!fs.existsSync(fullPath)) errors.push(`Missing required directory: ${path.relative(".", fullPath)}`);
}

const files = walkJsonl(root);
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const location = `${path.relative(".", file)}:${index + 1}`;
    try {
      validateRecord(JSON.parse(line), location);
    } catch (error) {
      errors.push(`${location}: invalid JSON (${error instanceof Error ? error.message : "parse failed"}).`);
    }
  });
}

if (files.length === 0) {
  warnings.push("No JSONL files found yet; schema/layout validation only.");
}

const summary = {
  success: errors.length === 0,
  root: path.relative(".", root),
  filesChecked: files.length,
  recordsChecked: ids.size,
  warnings,
  errors,
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.success) process.exit(1);
