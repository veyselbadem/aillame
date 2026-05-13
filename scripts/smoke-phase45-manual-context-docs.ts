import fs from "node:fs";
import path from "node:path";

type Check = {
  name: string;
  run: () => void;
};

type LoadedDoc = {
  label: string;
  relativePath: string;
  absolutePath: string;
  content: string;
};

const DOC_PATHS = [
  { label: "README", relativePath: "README.md" },
  { label: "FlowDoc", relativePath: "docs/manual-workspace-context.md" },
  { label: "ChecklistDoc", relativePath: "docs/manual-workspace-context-safety-checklist.md" },
] as const;

const ROOT = process.cwd();

const loadedDocs: LoadedDoc[] = DOC_PATHS.map((d) => {
  const absolutePath = path.join(ROOT, d.relativePath);
  const exists = fs.existsSync(absolutePath);
  if (!exists) {
    return {
      label: d.label,
      relativePath: d.relativePath,
      absolutePath,
      content: "",
    };
  }

  return {
    label: d.label,
    relativePath: d.relativePath,
    absolutePath,
    content: fs.readFileSync(absolutePath, "utf8"),
  };
});

function doc(label: LoadedDoc["label"]): LoadedDoc {
  const found = loadedDocs.find((d) => d.label === label);
  if (!found) {
    throw new Error(`Missing doc mapping: ${label}`);
  }
  return found;
}

const checks: Check[] = [
  {
    name: "required docs exist",
    run: () => {
      for (const d of loadedDocs) {
        if (!d.content) {
          throw new Error(`required doc missing: ${d.relativePath}`);
        }
      }
    },
  },
  {
    name: "cross-link flow -> checklist",
    run: () => {
      const flow = doc("FlowDoc").content;
      if (!/\(manual-workspace-context-safety-checklist\.md\)/i.test(flow)) {
        throw new Error("flow doc does not link checklist doc");
      }
    },
  },
  {
    name: "cross-link checklist -> flow",
    run: () => {
      const checklist = doc("ChecklistDoc").content;
      if (!/\(manual-workspace-context\.md\)/i.test(checklist)) {
        throw new Error("checklist doc does not link flow doc");
      }
    },
  },
  {
    name: "readme links both docs",
    run: () => {
      const readme = doc("README").content;
      if (!/\(docs\/manual-workspace-context\.md\)/i.test(readme)) {
        throw new Error("readme missing flow doc link");
      }
      if (!/\(docs\/manual-workspace-context-safety-checklist\.md\)/i.test(readme)) {
        throw new Error("readme missing checklist doc link");
      }
    },
  },
  {
    name: "flow doc has mandatory sections",
    run: () => {
      const flow = doc("FlowDoc").content;
      const requiredPatterns = [
        /manual workspace context flow/i,
        /bu sistem ne de[ğg]ildir\??/i,
        /guvenlik sinirlar[ıi]/i,
        /nano taraf[ıi] davran[ıi][sş][ıi]/i,
        /test ve smoke script/i,
      ];
      for (const pattern of requiredPatterns) {
        if (!pattern.test(flow)) {
          throw new Error(`flow doc missing required section: ${pattern.source}`);
        }
      }
    },
  },
  {
    name: "checklist doc has mandatory sections",
    run: () => {
      const checklist = doc("ChecklistDoc").content;
      const requiredPatterns = [
        /manual workspace context safety checklist/i,
        /prompt\s*\/\s*context sin[ıi]rlar[ıi]/i,
        /metadata g[üu]venli[ğg]i/i,
        /nano davran[ıi][sş] g[üu]venli[ğg]i/i,
        /kod review checklist/i,
        /yasak de[ğg]i[sş]iklikler/i,
      ];
      for (const pattern of requiredPatterns) {
        if (!pattern.test(checklist)) {
          throw new Error(`checklist doc missing required section: ${pattern.source}`);
        }
      }
    },
  },
  {
    name: "security boundary phrases exist in docs",
    run: () => {
      const all = [doc("README").content, doc("FlowDoc").content, doc("ChecklistDoc").content].join("\n");
      const required = [
        /rag\s+(sistemi\s+)?de[ğg]ildir/i,
        /hidden\s*\/\s*system prompt/i,
        /metadata/i,
        /nano/i,
        /actionexecutor/i,
        /command registry/i,
        /localstorage/i,
        /sessionstorage/i,
      ];
      for (const pattern of required) {
        if (!pattern.test(all)) {
          throw new Error(`missing security phrase: ${pattern.source}`);
        }
      }
    },
  },
  {
    name: "negative sensitive patterns are absent",
    run: () => {
      const all = [doc("README").content, doc("FlowDoc").content, doc("ChecklistDoc").content].join("\n");

      const forbiddenPatterns: Array<{ name: string; pattern: RegExp }> = [
        {
          name: "real windows user path",
          pattern: /[a-zA-Z]:\\Users\\(?!\[REDACTED_PATH\])[A-Za-z0-9._-]+\\/,
        },
        {
          name: "real unix home path",
          pattern: /(?:\/home\/[a-zA-Z0-9._-]+\/|\/Users\/[a-zA-Z0-9._-]+\/)/,
        },
        {
          name: "raw env assignment",
          pattern: /\b(?:API_KEY|SECRET|TOKEN|PASSWORD)\b\s*=\s*[^\s]+/i,
        },
        {
          name: "secret token password example",
          pattern: /\b(?:secret|token|password)\b\s*[:=]\s*["']?[A-Za-z0-9._-]{6,}/i,
        },
        {
          name: "raw stack trace",
          pattern: /(?:traceback \(most recent call last\)|\berror:\s*\n\s+at\s+.+:\d+:\d+|\bat\s+.+\(.+:\d+:\d+\))/i,
        },
        {
          name: "pid value",
          pattern: /\bPID\b\s*[:=]\s*\d{2,}/i,
        },
        {
          name: "fullPath value example",
          pattern: /\bfullPath\b\s*[:=]\s*["']?[^\s"']+/i,
        },
        {
          name: "canonicalPath value example",
          pattern: /\bcanonicalPath\b\s*[:=]\s*["']?[^\s"']+/i,
        },
      ];

      for (const forbidden of forbiddenPatterns) {
        if (forbidden.pattern.test(all)) {
          throw new Error(`forbidden sensitive pattern found: ${forbidden.name}`);
        }
      }
    },
  },
];

const failedCheckNames: string[] = [];
let passedCount = 0;

for (const check of checks) {
  try {
    check.run();
    passedCount += 1;
  } catch {
    failedCheckNames.push(check.name);
  }
}

const failedCount = failedCheckNames.length;
const checkedDocs = loadedDocs.map((d) => d.relativePath);

console.log(`passed=${passedCount}`);
console.log(`failed=${failedCount}`);
console.log(`checked_docs=${checkedDocs.join(",")}`);
console.log(`failed_checks=${failedCheckNames.length > 0 ? failedCheckNames.join(",") : "none"}`);

if (failedCount > 0) {
  process.exit(1);
}
