import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Eğitim istatistiklerini oku ve döndür
export async function GET() {
  try {
    const logPath = path.join(process.cwd(), 'training_log.txt');
    const dataPath = path.join(process.cwd(), 'src', 'core', 'engine', 'data', 'input.txt');
    const checkpointDir = path.join(process.cwd(), 'src', 'core', 'engine', 'checkpoints');

    // Training log satırlarını parse et
    const lossHistory: { epoch: number; loss: number }[] = [];
    if (fs.existsSync(logPath)) {
      const lines = fs.readFileSync(logPath, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/Zaman Dilimi (\d+).*Kayıp: ([\d.]+)/);
        if (match) {
          lossHistory.push({ epoch: parseInt(match[1]), loss: parseFloat(match[2]) });
        }
      }
    }

    // Veri boyutu
    let dataSize = 0;
    let dataLines = 0;
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf8');
      dataSize = Buffer.byteLength(content, 'utf8');
      dataLines = content.split('\n').length;
    }

    // Checkpoint bilgisi
    let hasCheckpoint = false;
    let checkpointTime: string | null = null;
    const safetensorsPath = path.join(process.cwd(), 'src', 'core', 'engine', 'checkpoints', 'aillame_rust_tuned.safetensors');
    const ckptJsonPath = path.join(checkpointDir, 'aillame-nano-v1', 'model.json');

    if (fs.existsSync(safetensorsPath)) {
      hasCheckpoint = true;
      checkpointTime = fs.statSync(safetensorsPath).mtime.toISOString();
    } else if (fs.existsSync(ckptJsonPath)) {
      hasCheckpoint = true;
      checkpointTime = fs.statSync(ckptJsonPath).mtime.toISOString();
    }

    // Son 50 loss değeri
    const recentLoss = lossHistory.slice(-50);
    const bestLoss = lossHistory.length > 0 ? Math.min(...lossHistory.map(l => l.loss)) : null;
    const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].loss : null;

    return NextResponse.json({
      lossHistory: recentLoss,
      bestLoss,
      currentLoss,
      totalEpochs: lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].epoch : 0,
      dataSize,
      dataLines,
      hasCheckpoint,
      checkpointTime,
      rustCoreStatus: 'ready', // Build sonrası native olacak
      memoryEntries: 0, // Rust native sonra gelecek
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
