import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { checkLocalPort } from '../src/core/runtime/port-health';

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate test port'));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

async function withServer<T>(server: http.Server | net.Server, fn: (port: number) => Promise<T>): Promise<T> {
  const sockets = new Set<net.Socket>();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  const port = await new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(typeof address === 'string' || !address ? 0 : address.port);
    });
  });

  try {
    return await fn(port);
  } finally {
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function run() {
  console.log('======================================================');
  console.log(' AILLAME FAZ 24 PORT HEALTH VALIDATION');
  console.log('======================================================');

  const freePort = await getFreePort();
  const freeResult = await checkLocalPort({ port: freePort, timeoutMs: 120 });
  record('Free port is reported available', freeResult.ok && freeResult.available && !freeResult.occupied, freeResult.message);

  await withServer(net.createServer((socket) => socket.end()), async (port) => {
    const result = await checkLocalPort({ port, timeoutMs: 120 });
    record('Unknown listener is reported as conflict', !result.ok && result.occupied && result.owner === 'unknown', result.message);
    record('Conflict recommendation is user friendly', result.recommendation?.includes('Diğer yerel geliştirme sunucularını kapatıp tekrar deneyin.') === true);
  });

  await withServer(http.createServer((req, res) => {
    if (req.url === '/api/aillame/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: true, service: 'aillame-external-api' }));
      return;
    }
    res.writeHead(404);
    res.end();
  }), async (port) => {
    const result = await checkLocalPort({ port, timeoutMs: 250 });
    record('Aillame server is not treated as false conflict', result.ok && result.occupied && result.owner === 'aillame', result.message);
  });

  const routePath = path.join(process.cwd(), 'src/app/api/aillame/runtime/port-health/route.ts');
  const desktopRoutePath = path.join(process.cwd(), 'src/app/api/aillame/desktop/readiness/route.ts');
  const desktopUiPath = path.join(process.cwd(), 'src/app/admin/desktop-readiness/page.tsx');
  const supportPath = path.join(process.cwd(), 'docs/SUPPORT_AND_TROUBLESHOOTING.md');
  const packagingPath = path.join(process.cwd(), 'docs/TAURI_PACKAGING_NOTES.md');

  record('Port health API route exists', fs.existsSync(routePath));
  record('Desktop readiness includes port health', fs.readFileSync(desktopRoutePath, 'utf8').includes('checkLocalPort'));
  record('Desktop readiness UI renders port status', fs.readFileSync(desktopUiPath, 'utf8').includes('Port Durumu'));
  record('Support docs mention port conflict policy', fs.readFileSync(supportPath, 'utf8').includes('Aillame başka process'));
  record('Packaging docs mention no automatic process kill', fs.readFileSync(packagingPath, 'utf8').includes('otomatik sonlandırmaz'));

  const failed = checks.filter((check) => !check.ok);
  console.log('======================================================');
  console.log(`Sonuç: ${checks.length - failed.length}/${checks.length} kontrol geçti.`);
  console.log('======================================================');

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
