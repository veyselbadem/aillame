import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { topic, depth = 'detailed' } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API key not found in .env' }, { status: 500 });
        }

        // 1. Gemini'ye konu hakkında derinlemesine soru sor
        const prompt = `Aşağıdaki konu hakkında derinlemesine, teknik ve öğretici bir metin hazırla. 
        Bu metin yerel bir yapay zekanın (Aillame) eğitimi için kullanılacaktır. 
        Bilgiler kesin, üslup bilgece ve öğretici olmalıdır.
        
        Konu: ${topic}
        Derinlik: ${depth}
        
        Format: [KONU BAŞLIĞI] şeklinde başla ve metni bloklar halinde yaz.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        const data = await response.json();
        const distilledContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!distilledContent) {
            return NextResponse.json({ error: 'Gemini response empty' }, { status: 500 });
        }

        // 2. Gelen bilgiyi input.txt'ye ekle
        const dataPath = path.join(process.cwd(), 'src', 'core', 'engine', 'data', 'input.txt');
        const formattedEntry = `\n\n[GEMINI DISTILLATION - ${new Date().toLocaleDateString()}]\n${distilledContent}\n`;
        
        fs.appendFileSync(dataPath, formattedEntry, 'utf8');

        return NextResponse.json({ 
            success: true, 
            message: 'Bilgi Gemini\'den alındı ve Aillame hafızasına eklendi.',
            contentPreview: distilledContent.substring(0, 100) + '...'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
