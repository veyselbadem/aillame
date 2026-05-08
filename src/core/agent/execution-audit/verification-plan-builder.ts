export class VerificationPlanBuilder {
  build(changedFiles: string[], projectType: string): any {
    const commands: any[] = [];
    const manualChecks: string[] = [];

    const hasSourceChange = changedFiles.some(f => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js"));
    const hasPackageChange = changedFiles.some(f => f.includes("package.json"));
    const hasCoreChange = changedFiles.some(f => f.includes("src/core/"));

    if (hasSourceChange || hasPackageChange) {
      commands.push({
        command: "npm.cmd run typecheck",
        reason: "Source code modified, verify TypeScript types.",
        risk: "low",
        autoRun: false
      });
      commands.push({
        command: "npm.cmd run build",
        reason: "Ensure the project still compiles after changes.",
        risk: "medium",
        autoRun: false
      });
    }

    if (hasCoreChange) {
      commands.push({
        command: "npm.cmd run smoke:live-runtime-acceptance",
        reason: "Core logic modified, verify system-wide AI runtimes.",
        risk: "high",
        autoRun: false
      });
    }

    // Agent specific
    if (changedFiles.some(f => f.includes("src/core/agent/"))) {
      commands.push({
        command: "npm.cmd run smoke:workspace-scanner",
        reason: "Agent logic modified, verify scanner integrity.",
        risk: "medium",
        autoRun: false
      });
    }

    manualChecks.push("Verify the specific feature related to the user task.");
    manualChecks.push("Check application logs for any new warnings or errors.");

    return {
      summary: `Generated ${commands.length} verification commands for ${changedFiles.length} modified files.`,
      suggestedCommands: commands,
      manualChecks
    };
  }
}
