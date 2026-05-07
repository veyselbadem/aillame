/**
 * Legacy cleanup smoke guard.
 *
 * Keeps product messaging aligned with the Local AI Hub direction without
 * touching real runtime data, secrets, model files or external networks.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const checks = [];
let failed = false;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(name, fn) {
  try {
    const detail = fn();
    if (detail === true) {
      checks.push({ name, ok: true, detail: "Passed" });
      return;
    }
    checks.push({ name, ok: false, detail });
    failed = true;
  } catch (error) {
    checks.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    failed = true;
  }
}

function hasRequiredDependencyLanguage(text, toolName) {
  return text.split(/\r?\n/).some((line) => {
    const lower = line.toLowerCase();
    if (!lower.includes(toolName.toLowerCase())) return false;
    if (lower.includes("değildir")
      || lower.includes("olmamalı")
      || lower.includes("not required")
      || lower.includes("zorunlu dependency değildir")) {
      return false;
    }
    return lower.includes("required dependency")
      || lower.includes("default fast text provider")
      || lower.includes("zorunlu bağımlılık")
      || lower.includes("ana mimari adı");
  });
}

console.log("Running legacy cleanup smoke tests...\n");

const readme = read("README.md");
const envExample = read(".env.example");
const aiLabDoc = read("docs/AI_LAB_ORCHESTRATION.md");
const rcDoc = read("docs/releases/beta-foundation-rc.md");
const sidebar = read("src/components/Sidebar.tsx");
const aiLabPage = read("src/app/admin/ai-lab/page.tsx");
const pkg = JSON.parse(read("package.json"));

check("README uses Local AI Hub product story", () => {
  if (!readme.includes("Aillame Local AI Hub")) return "README title does not state Local AI Hub.";
  if (!readme.includes("Aillame-controlled runtime/worker")) return "README missing Aillame-controlled runtime/worker acceptance language.";
  if (!readme.includes("Live Runtime Acceptance")) return "README missing Live Runtime Acceptance distinction.";
  return true;
});

check("External tools are not described as required dependencies", () => {
  const docs = [readme, envExample, aiLabDoc].join("\n");
  for (const tool of ["Ollama", "ComfyUI", "LM Studio"]) {
    if (hasRequiredDependencyLanguage(docs, tool)) {
      return `${tool} still appears as a required/default architecture dependency.`;
    }
  }
  return true;
});

check("Final LLM and IGM acceptance criteria are documented", () => {
  const docs = `${readme}\n${rcDoc}`;
  if (!docs.includes("yerel LLM")) return "Missing local LLM acceptance language.";
  if (!docs.includes("yerel IGM")) return "Missing local IGM acceptance language.";
  if (!docs.includes("foundation") || !docs.includes("not-configured")) return "Missing foundation/not-configured limitation language.";
  return true;
});

check("AI Lab is positioned as evaluation playground", () => {
  const docs = `${aiLabDoc}\n${aiLabPage}\n${sidebar}`;
  if (!docs.includes("evaluation/playground") && !docs.includes("evaluation playground")) return "AI Lab role is not clearly evaluation/playground.";
  if (docs.includes("AI Laboratory")) return "Old AI Laboratory title remains.";
  return true;
});

check(".env.example exposes current generic config surface", () => {
  const required = [
    "AILLAME_DATA_DIR",
    "AILLAME_EXTERNAL_API_AUTH_REQUIRED",
    "AILLAME_API_KEY_STORE_DRIVER",
    "AILLAME_MODEL_DISCOVERY_ENABLED",
    "AILLAME_GGUF_RUNTIME_ENABLED",
    "AILLAME_GGUF_MODEL_DIR",
    "AILLAME_IGM_RUNTIME_ENABLED",
    "AILLAME_IGM_MODEL_DIR",
    "AILLAME_IGM_ACTIVE_MODEL",
    "AILLAME_DOCUMENT_LIBRARY_ENABLED",
    "AILLAME_RUNTIME_ACCEPTANCE_REQUIRED",
  ];
  const missing = required.filter((name) => !envExample.includes(name));
  return missing.length ? `Missing env names: ${missing.join(", ")}` : true;
});

check("No mojibake markers in cleaned product docs", () => {
  const cleanedDocs = [readme, envExample, aiLabDoc, rcDoc].join("\n");
  if (/[ÃÄÅ�]/.test(cleanedDocs)) return "Mojibake marker found in cleaned docs.";
  return true;
});

check("package.json scripts point to existing local files", () => {
  const missing = [];
  for (const [name, command] of Object.entries(pkg.scripts || {})) {
    const match = String(command).match(/node\s+(scripts\/[^\s&]+)/);
    if (match && !fs.existsSync(path.join(root, match[1]))) {
      missing.push(`${name} -> ${match[1]}`);
    }
  }
  return missing.length ? `Missing script targets: ${missing.join(", ")}` : true;
});

check("legacy cleanup script is registered", () => {
  return pkg.scripts?.["smoke:legacy-cleanup"] === "node scripts/smoke-legacy-cleanup.mjs"
    ? true
    : "Missing smoke:legacy-cleanup script.";
});

console.log(JSON.stringify({ success: !failed, checks }, null, 2));

if (failed) {
  process.exit(1);
}
