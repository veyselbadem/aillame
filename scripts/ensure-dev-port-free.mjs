import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.AILLAME_DEV_PORT || 3000);

async function runPowerShell(command) {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `${command}\nexit 0`],
    { windowsHide: true },
  );
  return stdout.trim();
}

async function getPortOwners(port) {
  const { stdout } = await execFileAsync('netstat.exe', ['-ano'], { windowsHide: true });
  const ownerIds = new Set();

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] !== 'TCP') continue;
    const [localAddress, state, pid] = [parts[1], parts[3], parts[4]];
    if (state !== 'LISTENING') continue;
    if (localAddress.endsWith(`:${port}`)) {
      ownerIds.add(pid);
    }
  }

  if (ownerIds.size === 0) return [];

  const filter = Array.from(ownerIds)
    .map((pid) => `ProcessId=${pid}`)
    .join(' OR ');
  const command = `
$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Process -Filter "${filter}" |
  Select-Object ProcessId,Name,CommandLine |
  ConvertTo-Json -Compress
`;
  const output = await runPowerShell(command);
  if (!output) {
    return Array.from(ownerIds).map((pid) => ({
      ProcessId: Number(pid),
      Name: 'node.exe',
      CommandLine: '',
    }));
  }
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function isSafeAillameDevProcess(processInfo) {
  const name = String(processInfo.Name || '').toLowerCase();
  const commandLine = String(processInfo.CommandLine || '').toLowerCase();

  if (!name.includes('node')) return false;
  if (!commandLine) return true;

  return (
    commandLine.includes('next') ||
    commandLine.includes('next-dev') ||
    commandLine.includes('node_modules') ||
    commandLine.includes('aillame')
  );
}

async function main() {
  if (process.platform !== 'win32') {
    console.log(`[Aillame] Port ${PORT} kontrolu Windows disi ortamda atlandi.`);
    return;
  }

  const owners = await getPortOwners(PORT);

  if (owners.length === 0) {
    console.log(`[Aillame] Port ${PORT} bos. Dev sunucusu baslatilabilir.`);
    return;
  }

  for (const owner of owners) {
    const looksLikeAillame = isSafeAillameDevProcess(owner);
    console.error(`[Aillame] Port ${PORT} kullanimda, surec otomatik kapatilmadi.`);
    console.error(`[Aillame] PID ${owner.ProcessId}: ${owner.Name}`);
    console.error(
      looksLikeAillame
        ? '[Aillame] Bu surec Aillame/Next dev sunucusu gibi gorunuyor. Lutfen manuel kapatip tekrar deneyin.'
        : '[Aillame] Bu surec Aillame/Next dev sunucusu gibi gorunmuyor. Lutfen portu manuel bosaltin.',
    );
  }

  console.error('[Aillame] Aillame baska processleri otomatik sonlandirmaz.');
  process.exit(1);
}

main().catch((error) => {
  console.error('[Aillame] Dev port kontrolu basarisiz oldu.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
