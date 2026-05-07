import { analyzeProblemReadOnly } from "./problem-analyzer";

const result = analyzeProblemReadOnly({
  projectType: "node",
  command: "node node_modules/typescript/bin/tsc --noEmit",
  logText: "src/app.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.",
});

if (!result.success || result.category !== "typescript" || result.readOnly !== true) {
  console.error(result);
  throw new Error("Problem analyzer smoke failed.");
}

console.log(`[PASS] problem category=${result.category}`);
console.log(`[PASS] severity=${result.severity}, confidence=${result.confidence}`);
console.log(`[PASS] evidence=${result.evidence.length}`);
