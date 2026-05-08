import fs from 'fs';
import path from 'path';

async function runSmokeTest() {
  console.log("Running Agent UI Smoke Tests...");

  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    const pagePath = path.join(process.cwd(), 'src/app/admin/agent/page.tsx');
    
    // 1. File existence
    addCheck("Page file exists", fs.existsSync(pagePath), "src/app/admin/agent/page.tsx not found");

    if (fs.existsSync(pagePath)) {
      const content = fs.readFileSync(pagePath, 'utf8');

      // 2. Component structure
      addCheck("Uses client directive", content.includes("'use client'"), "Missing 'use client'");
      addCheck("Imported icons", content.includes("react-icons/fi"), "Icons not imported");

      // 3. Workflow keywords
      addCheck("Has Workspace Tara", content.includes("Workspace Tara"), "Missing workspace scan button");
      addCheck("Has Patch Proposal", content.includes("Patch Proposal"), "Missing patch proposal text");
      addCheck("Has Dry Run", content.includes("Dry Run"), "Missing dry run button");
      addCheck("Has Execution Audit", content.includes("EXECUTION AUDIT"), "Missing audit text");

      // 4. Security keywords
      addCheck("Has Approval Gate UI", content.includes("approvalText"), "Missing approval text state");
      addCheck("Has Safety Flags", content.includes("SafetyFlag"), "Missing safety flags component");
      addCheck("Has Path Masking intent", content.includes("maskelenmiş"), "Missing path masking notice");
      addCheck("No direct exec warning", content.includes("komutlarını kendisi çalıştırmaz"), "Missing manual exec warning");
    }

    // 5. Sidebar link check
    const sidebarPath = path.join(process.cwd(), 'src/components/Sidebar.tsx');
    if (fs.existsSync(sidebarPath)) {
      const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
      addCheck("Sidebar has Agent link", sidebarContent.includes("/admin/agent") && sidebarContent.includes("Code Agent"), "Sidebar link missing");
    }

  } catch (error: any) {
    console.error("Smoke test failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nFinal Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runSmokeTest();
