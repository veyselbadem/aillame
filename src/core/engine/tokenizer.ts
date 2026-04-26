/**
 * AillameTokenizer - Karakter seviyesinde metin kodlayıcı.
 * Aillame'nin okuma ve yazma yeteneğinin temelini oluşturur.
 */
export class AillameTokenizer {
    private chars: string[] = [];
    private stoi: { [key: string]: number } = {};
    private itos: { [key: number]: string } = {};
    public vocabSize: number = 0;

    constructor() {}

    /**
     * Verilen metinden benzersiz karakterleri öğrenir.
     * Sabit karakter seti kullanarak indeks kaymalarını önler (Vocab Mismatch Fix).
     */
    train(text: string): void {
        // Sabit ve kapsamlı bir karakter seti (Türkçe + ASCII + Semboller)
        const baseChars = "\n\r\t !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ÇÖĞÜŞİçöğüşığ";
        
        this.chars = [];
        this.stoi = {};
        this.itos = {};

        // Önce sabit seti ekle (indeksler asla değişmez)
        for (const char of baseChars) {
            if (this.stoi[char] === undefined) {
                this.chars.push(char);
                const index = this.chars.length - 1;
                this.stoi[char] = index;
                this.itos[index] = char;
            }
        }

        // Metinde olup da sabit sette olmayanları ekle (256 limitine kadar)
        const uniqueChars = Array.from(new Set(text));
        for (const char of uniqueChars) {
            if (this.stoi[char] === undefined && this.chars.length < 256) {
                this.chars.push(char);
                const index = this.chars.length - 1;
                this.stoi[char] = index;
                this.itos[index] = char;
            }
        }

        this.vocabSize = 256; // Rust motoruyla (8/256) tam uyum için
        console.log(`Tokenizer sabitlendi. Aktif Karakterler: ${this.chars.length} / 256`);
    }

    /**
     * Metni sayı dizisine (tokenlara) çevirir.
     */
    encode(text: string): number[] {
        return text.split('').map(char => {
            const id = this.stoi[char];
            if (id === undefined) return 0; // Bilinmeyen karakterler için default
            return id;
        });
    }

    /**
     * Token dizisini insan formatında metne çevirir.
     */
    decode(tokens: number[]): string {
        return tokens.map(token => this.itos[token] || '').join('');
    }

    /**
     * Sözlüğü bir JSON dosyasına kaydeder (Sadece Node.js).
     */
    save(filePath: string): void {
        const data = {
            chars: this.chars,
            stoi: this.stoi,
            itos: this.itos
        };
        try {
            // Dinamik import ile tarayıcıda hata almasını engelliyoruz
            const fs = require('fs');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Tokenizer kaydedildi: ${filePath}`);
        } catch (e) {
            console.log('Tokenizer kaydı sadece Node.js ortamında desteklenir.');
        }
    }

    /**
     * Kayıtlı bir sözlüğü yükler (Sadece Node.js).
     */
    load(filePath: string): boolean {
        try {
            const fs = require('fs');
            if (!fs.existsSync(filePath)) return false;
            const rawData = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(rawData);
            this.chars = data.chars;
            this.stoi = data.stoi;
            this.itos = data.itos;
            this.vocabSize = this.chars.length;
            return true;
        } catch (error) {
            return false;
        }
    }
}
