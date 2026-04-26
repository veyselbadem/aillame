/**
 * Faz 2.2: Canlı Öğrenme Köprüsü (Live Learning Bridge)
 * 
 * Bu modül, Aillame'in bir konuşmadan veya araştırmadan kazandığı yeni bilgileri
 * hem Rust motorunun hafızasına (vektör) hem de eğitim verisine (input.txt) 
 * ANLIK olarak kayıt eden köprüyü sağlar.
 */

export interface LiveLearningEntry {
    source: 'conversation' | 'document' | 'research';
    userMessage?: string;
    assistantMessage?: string;
    rawContent?: string;
    timestamp: string;
}

class LiveLearningBridge {
    private queue: LiveLearningEntry[] = [];
    private isFlushing = false;
    private listeners: ((entry: LiveLearningEntry) => void)[] = [];

    /**
     * Yeni bir öğrenme girdisi ekler ve API'ye gönderir.
     */
    async learn(entry: Omit<LiveLearningEntry, 'timestamp'>): Promise<void> {
        const fullEntry: LiveLearningEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
        };

        // Anlık bildirim (UI için)
        this.listeners.forEach(l => l(fullEntry));
        this.queue.push(fullEntry);

        // Kuyrukta bekleyenleri boşalt
        await this.flush();
    }

    /**
     * Konuşmadan öğrenme (en sık kullanılan)
     */
    async learnFromConversation(userMessage: string, assistantMessage: string): Promise<void> {
        await this.learn({
            source: 'conversation',
            userMessage,
            assistantMessage,
        });
    }

    /**
     * Ham içerikten öğrenme (dokümanlar, web araştırması)
     */
    async learnFromContent(content: string, source: 'document' | 'research' = 'document'): Promise<void> {
        await this.learn({
            source,
            rawContent: content,
        });
    }

    /**
     * Kuyruğu API'ye gönderir
     */
    private async flush(): Promise<void> {
        if (this.isFlushing || this.queue.length === 0) return;
        this.isFlushing = true;

        while (this.queue.length > 0) {
            const entry = this.queue.shift()!;
            try {
                await this.sendToAPI(entry);
            } catch (e) {
                console.error('[LiveLearning] API gönderilemedi, yeniden deneniyor:', e);
                this.queue.unshift(entry); // Başa geri ekle
                break;
            }
        }

        this.isFlushing = false;
    }

    /**
     * API'ye gönderir - hem input.txt'e yazar hem de Rust hafızasına ekler
     */
    private async sendToAPI(entry: LiveLearningEntry): Promise<void> {
        const payload = entry.source === 'conversation'
            ? { userMessage: entry.userMessage, assistantMessage: entry.assistantMessage }
            : { userMessage: 'CONTENT', assistantMessage: entry.rawContent };

        // Standart öğrenme API'sine gönder (input.txt'e yazar)
        await fetch('/api/learning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // Rust bellek katmanına da gönder (vektör hafızası)
        if (entry.rawContent || (entry.userMessage && entry.assistantMessage)) {
            const content = entry.rawContent || `${entry.userMessage} ${entry.assistantMessage}`;
            await fetch('/api/core/bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_memory', content }),
            });
        }
    }

    /**
     * Öğrenme olaylarını dinler (UI güncellemeleri için)
     */
    onLearn(callback: (entry: LiveLearningEntry) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }
}

// Singleton instance - uygulama boyunca tek bir köprü çalışır
export const liveLearning = new LiveLearningBridge();
