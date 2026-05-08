export class DiffBuilder {
  private static MAX_DIFF_LINES = 100;

  buildUnifiedDiff(relativePath: string, before: string, after: string): string {
    const linesBefore = before.split("\n");
    const linesAfter = after.split("\n");
    
    const diffRows: string[] = [];
    diffRows.push(`--- a/${relativePath}`);
    diffRows.push(`+++ b/${relativePath}`);
    diffRows.push(`@@ -proposed +change @@`);

    // Extremely simple diff logic for proposal purposes
    // (In a real system, we'd use a diff library, but here we prioritize dependency-free)
    
    let lineCount = 0;
    const max = Math.max(linesBefore.length, linesAfter.length);

    for (let i = 0; i < max; i++) {
      if (lineCount >= DiffBuilder.MAX_DIFF_LINES) {
        diffRows.push("... (diff truncated)");
        break;
      }

      if (linesBefore[i] !== linesAfter[i]) {
        if (i < linesBefore.length) {
          diffRows.push(`-${linesBefore[i]}`);
          lineCount++;
        }
        if (i < linesAfter.length) {
          diffRows.push(`+${linesAfter[i]}`);
          lineCount++;
        }
      } else {
        // Only show a few context lines if needed, but for proposal we show the change
        // For now, let's keep it simple and only show changes
      }
    }

    return diffRows.join("\n");
  }
}
