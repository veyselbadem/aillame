import { spawn } from 'child_process';
import * as path from 'path';
import { getProjectRoot, resolveProjectRelative } from '../project-root';

export type PythonRunResult = {
  stdout: string;
  stderr: string;
};

export function getPythonCommand(): string {
  const cmd = process.env.AILLAME_PYTHON || 'python';
  return resolveProjectRelative(cmd);
}

export function getScriptPath(...segments: string[]): string {
  return path.join(getProjectRoot(), 'src', 'core', ...segments);
}

export function runPythonScript(
  scriptPath: string,
  args: string[] = [],
  input?: unknown,
  timeoutMs = 120000,
  pythonCommand?: string
): Promise<PythonRunResult> {
  const projectRoot = getProjectRoot();
  const command = pythonCommand ? resolveProjectRelative(pythonCommand) : getPythonCommand();
  return new Promise((resolve, reject) => {
    const child = spawn(command, [scriptPath, ...args], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Python runner timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `Python runner exited with code ${code}`));
      }
    });

    if (input !== undefined) {
      child.stdin.write(JSON.stringify(input));
    }
    child.stdin.end();
  });
}

export function parsePythonJson<T>(result: PythonRunResult): T {
  try {
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    throw new Error(`Python runner did not return JSON: ${result.stdout || result.stderr}`);
  }
}
