import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { userMessage, assistantMessage } = await req.json();

    if (!userMessage || !assistantMessage) {
      return NextResponse.json({ error: 'Eksik veri' }, { status: 400 });
    }

    const inputPath = path.join(process.cwd(), 'src', 'core', 'engine', 'data', 'input.txt');
    
    // Veriyi modelin anlayacağı formatta hazırla
    const newEntry = `\n[CANLI ÖĞRENME - ${new Date().toLocaleDateString('tr-TR')}]\nUser: ${userMessage}\nAssistant: ${assistantMessage}\n`;

    // Dosyanın sonuna ekle
    fs.appendFileSync(inputPath, newEntry, 'utf8');

    return NextResponse.json({ success: true, message: 'Bilgi kütüphaneye eklendi' });
  } catch (error: any) {
    console.error('Learning API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
