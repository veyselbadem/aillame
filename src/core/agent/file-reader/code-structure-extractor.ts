export class CodeStructureExtractor {
  extract(content: string, extension: string): any {
    const structure = {
      imports: [] as string[],
      exports: [] as string[],
      functions: [] as string[],
      classes: [] as string[],
      components: [] as string[],
      routes: [] as string[],
      scripts: [] as string[]
    };

    const lines = content.split("\n");
    const ext = extension.toLowerCase();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 1. JS/TS
      if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
        if (trimmed.startsWith("import ")) structure.imports.push(trimmed);
        if (trimmed.startsWith("export ")) structure.exports.push(trimmed);
        
        const funcMatch = trimmed.match(/(?:function|const|let)\s+([a-zA-Z0-9_]+)\s*=?\s*(?:\([^)]*\)|async\s+)?\s*=>|function\s+([a-zA-Z0-9_]+)/);
        if (funcMatch) {
          const name = funcMatch[1] || funcMatch[2];
          if (name) {
            if (/^[A-Z]/.test(name) && ext.includes("x")) structure.components.push(name);
            else structure.functions.push(name);
          }
        }

        if (trimmed.startsWith("class ")) {
          const className = trimmed.match(/class\s+([a-zA-Z0-9_]+)/)?.[1];
          if (className) structure.classes.push(className);
        }

        if (trimmed.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/)) {
          const route = trimmed.match(/(GET|POST|PUT|DELETE|PATCH)/)?.[1];
          if (route) structure.routes.push(route);
        }
      }

      // 2. Python
      if (ext === ".py") {
        if (trimmed.startsWith("import ") || trimmed.startsWith("from ")) structure.imports.push(trimmed);
        if (trimmed.startsWith("def ")) {
          const name = trimmed.match(/def\s+([a-zA-Z0-9_]+)/)?.[1];
          if (name) structure.functions.push(name);
        }
        if (trimmed.startsWith("class ")) {
          const name = trimmed.match(/class\s+([a-zA-Z0-9_]+)/)?.[1];
          if (name) structure.classes.push(name);
        }
      }

      // 3. Rust
      if (ext === ".rs") {
        if (trimmed.startsWith("use ")) structure.imports.push(trimmed);
        if (trimmed.startsWith("pub fn ") || trimmed.startsWith("fn ")) {
          const name = trimmed.match(/fn\s+([a-zA-Z0-9_]+)/)?.[1];
          if (name) structure.functions.push(name);
        }
        if (trimmed.startsWith("struct ") || trimmed.startsWith("enum ")) {
          const name = trimmed.match(/(?:struct|enum)\s+([a-zA-Z0-9_]+)/)?.[1];
          if (name) structure.classes.push(name);
        }
      }
    }

    // Special: package.json
    if (ext === ".json" && content.includes('"scripts"')) {
      try {
        const pkg = JSON.parse(content);
        if (pkg.scripts) structure.scripts = Object.keys(pkg.scripts);
      } catch {}
    }

    // Limit counts
    return {
      imports: structure.imports.slice(0, 15),
      exports: structure.exports.slice(0, 10),
      functions: Array.from(new Set(structure.functions)).slice(0, 15),
      classes: Array.from(new Set(structure.classes)).slice(0, 10),
      components: Array.from(new Set(structure.components)).slice(0, 10),
      routes: Array.from(new Set(structure.routes)).slice(0, 5),
      scripts: structure.scripts.slice(0, 10)
    };
  }
}
