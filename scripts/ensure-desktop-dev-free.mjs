import { execFile } from 'node:child_process';
import { access, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const debugExePath = path.resolve(repoRoot, 'src-tauri', 'target', 'debug', 'aillame.exe');
const workspaceExeSuffix = ['src-tauri', 'target', 'debug', 'aillame.exe'].join('\\');

function normalizeWindowsPath(value) {
  return String(value || '')
    .replace(/\//g, '\\')
    .replace(/\\+/g, '\\')
    .toLocaleLowerCase('tr-TR');
}

function isWorkspaceDebugExe(processPath) {
  const normalizedProcessPath = normalizeWindowsPath(processPath);
  const normalizedDebugPath = normalizeWindowsPath(debugExePath);
  const normalizedSuffix = normalizeWindowsPath(workspaceExeSuffix);

  return (
    normalizedProcessPath === normalizedDebugPath ||
    normalizedProcessPath.endsWith(`\\${normalizedSuffix}`)
  );
}

async function runPowerShell(command) {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `${command}\nexit 0`],
    { windowsHide: true },
  );
  return stdout.trim();
}

async function getAillameProcesses() {
  const command = `
$ErrorActionPreference = 'SilentlyContinue'
Get-Process -Name aillame |
  Select-Object Id,ProcessName,Path |
  ConvertTo-Json -Compress
`;
  const output = await runPowerShell(command);
  if (!output) return [];

  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function stopProcess(pid) {
  try {
    await execFileAsync('taskkill.exe', ['/PID', String(pid), '/F'], { windowsHide: true });
  } catch {
    await runPowerShell(`Stop-Process -Id ${pid} -Force`);
  }
}

async function waitForWorkspaceProcessesToExit(timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const remaining = (await getAillameProcesses()).filter((proc) => isWorkspaceDebugExe(proc.Path));
    if (remaining.length === 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function removeUnlockedDebugExeIfPossible() {
  try {
    await access(debugExePath, constants.F_OK);
  } catch {
    return;
  }

  try {
    await unlink(debugExePath);
    console.log('[Aillame] Eski debug exe dosyası silindi. Cargo temiz binary üretecek.');
  } catch (error) {
    console.warn('[Aillame] Debug exe dosyası şu an silinemedi; Cargo tekrar deneyecek.');
    console.warn(`[Aillame] Kilitli dosya: ${debugExePath}`);
    console.warn(`[Aillame] Detay: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('[Aillame] Desktop debug süreç kontrolü Windows dışı ortamda atlandı.');
    return;
  }

  const processes = await getAillameProcesses();
  const workspaceProcesses = processes.filter((proc) => isWorkspaceDebugExe(proc.Path));
  const otherProcesses = processes.filter((proc) => !isWorkspaceDebugExe(proc.Path));

  for (const proc of otherProcesses) {
    console.log(`[Aillame] Başka bir aillame.exe çalışıyor, dokunulmadı: PID ${proc.Id} (${proc.Path || 'yol okunamadı'})`);
  }

  if (workspaceProcesses.length === 0) {
    console.log('[Aillame] Eski desktop debug süreci bulunamadı.');
    await removeUnlockedDebugExeIfPossible();
    return;
  }

  for (const proc of workspaceProcesses) {
    console.log(`[Aillame] Eski workspace desktop süreci kapatılıyor: PID ${proc.Id}`);
    console.log(`[Aillame] Süreç yolu: ${proc.Path}`);
    await stopProcess(proc.Id);
  }

  const exited = await waitForWorkspaceProcessesToExit();
  if (!exited) {
    console.error('[Aillame] Eski desktop süreci kapatılamadı; aillame.exe dosyası kilitli kalabilir.');
    console.error('[Aillame] Lütfen Aillame penceresini kapatıp tekrar deneyin.');
    process.exit(1);
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));
  await removeUnlockedDebugExeIfPossible();
  console.log('[Aillame] Desktop debug kilidi temizlendi.');
}

main().catch((error) => {
  console.error('[Aillame] Desktop debug süreç kontrolü başarısız oldu.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
