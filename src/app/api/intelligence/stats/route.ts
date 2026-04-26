import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const logPath = path.join(process.cwd(), 'training_log.txt');
        const inputPath = path.join(process.cwd(), 'src', 'core', 'engine', 'data', 'input.txt');
        
        let logContent = '';
        if (fs.existsSync(logPath)) {
            logContent = fs.readFileSync(logPath, 'utf8');
        }

        let inputContent = '';
        if (fs.existsSync(inputPath)) {
            inputContent = fs.readFileSync(inputPath, 'utf8');
        }

        // Loss değerlerini ayıkla: "Zaman Dilimi 100/50000 - Kayıp: 4.816"
        const lossMatches = [...logContent.matchAll(/Zaman Dilimi (\d+)\/50000 - Kayıp: ([\d.]+)/g)];
        const lossHistory = lossMatches.map(m => ({
            epoch: parseInt(m[1]),
            loss: parseFloat(m[2])
        })).slice(-20); // Son 20 kayıt

        // Mevcut sözlük boyutunu bul
        const vocabMatch = logContent.match(/dense_Dense5 \(Dense\)\s+\[\[null,64,64\]\]\s+\[null,64,(\d+)\]/);
        const currentVocab = vocabMatch ? parseInt(vocabMatch[1]) : 0;

        // Bilgi tabanı satır sayısı
        const knowledgeLines = inputContent.split('\n').filter(l => l.trim().length > 0).length;

        // Son 10 log satırı
        const recentLogs = logContent.split('\n').filter(l => l.trim().length > 0).slice(-10);

        return NextResponse.json({
            success: true,
            stats: {
                lossHistory,
                currentVocab,
                knowledgeLines,
                totalEpochs: 1000000,
                currentEpoch: lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].epoch : 0,
                recentLogs,
                isLearning: true // Arka planda Node süreci çalıştığı için
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
