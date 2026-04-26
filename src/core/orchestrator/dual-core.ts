import type { LLMProvider } from '../../providers/llm/base';

export type DualCoreMode = 'freestyle' | 'restricted';
export type ActiveCore = 'nano' | 'pro';

export interface DualCoreMessage {
    core: ActiveCore;
    message: string;
}

type EventCallback = (...args: any[]) => void;

/**
 * Aillame Dual-Core Orchestrator
 * Bu sınıf Nano (yerel Rust) ve Pro (Qwen3-VL 8B) çekirdekleri arasındaki diyaloğu
 * yönetir, birbirlerine veri aktarır ve sohbeti kontrol altında tutar.
 */
export class DualCoreOrchestrator {
    private nanoCore: LLMProvider;
    private proCore: LLMProvider;
    
    private mode: DualCoreMode = 'freestyle';
    private isRunning: boolean = false;
    private currentTopic: string = '';
    
    private listeners: Record<string, EventCallback[]> = {};

    constructor(nano: LLMProvider, pro: LLMProvider) {
        this.nanoCore = nano;
        this.proCore = pro;
    }

    on(event: string, callback: EventCallback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    private emit(event: string, ...args: any[]) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(...args));
        }
    }

    /**
     * Motorların serbest mi yoksa belirli bir konuya kısıtlı mı kalacağını belirler
     */
    setMode(mode: DualCoreMode) {
        this.mode = mode;
        console.log(`[Dual-Core] Mod değiştirildi: ${mode}`);
        this.emit('modeChanged', mode);
    }

    /**
     * İki çekirdek arasındaki sonsuz tartışma döngüsünü başlatır
     */
    async startDialogue(topic: string) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.currentTopic = topic;
        console.log(`[Dual-Core] Köprü aktif edildi. Konu: ${topic}`);
        this.emit('started', topic);

        // Modelleri yükle/hazırla
        if ('isReady' in this.nanoCore && !this.nanoCore.isReady()) {
            if ('loadModel' in this.nanoCore) await (this.nanoCore as any).loadModel();
        }
        if ('isReady' in this.proCore && !this.proCore.isReady()) {
            if ('loadModel' in this.proCore) await (this.proCore as any).loadModel();
        }

        let turn: ActiveCore = 'nano'; // Tartışmayı her zaman kendi motorumuz (Nano) başlatır
        let lastMessage = `Lütfen "${topic}" konusu hakkındaki temel bilgilerini paylaş.`;

        // Ana diyalog döngüsü
        while (this.isRunning) {
            try {
                const activeModel = turn === 'nano' ? this.nanoCore : this.proCore;
                
                // Prompt mühendisliği: Mode göre yönlendirme yapıyoruz
                let prompt = '';
                if (this.mode === 'restricted') {
                    prompt = `[Sistem Kuralı: Sadece "${this.currentTopic}" konusu üzerine konuş. Diğer konulardan bahsetme.]\nDiğer çekirdeğin son sözleri: "${lastMessage}"\nCevabın:`;
                } else {
                    prompt = `[Sistem Kuralı: Serbest ve felsefi sohbet.]\nDiğer çekirdeğin son sözleri: "${lastMessage}"\nDevam et:`;
                }

                // UI'a turun kimde olduğunu bildiriyoruz
                this.emit('turnStart', turn);
                
                let fullResponse = '';
                
                // Modelden cevabı alıyoruz (streaming)
                await activeModel.generate(prompt, (token) => {
                    if (!this.isRunning) return; // Durdurulmuşsa token akışını kes
                    fullResponse += token;
                    this.emit('token', { core: turn, token });
                });

                if (!this.isRunning) break;

                lastMessage = fullResponse.trim();
                
                // UI'a tam mesajı iletiyoruz
                this.emit('turnEnd', { core: turn, message: lastMessage });

                // Konuşma sırasını diğer çekirdeğe geçir
                turn = turn === 'nano' ? 'pro' : 'nano';

                // Motorların art arda yorulmaması ve okunabilirlik için 2 saniye dinlenme payı
                await new Promise(res => setTimeout(res, 2000));
            } catch (error) {
                console.error("[Dual-Core] Diyalog köprüsünde hata:", error);
                this.stopDialogue();
            }
        }
    }

    /**
     * Tartışma köprüsünü durdurur
     */
    stopDialogue() {
        if (!this.isRunning) return;
        this.isRunning = false;
        console.log('[Dual-Core] Köprü kapatıldı.');
        this.emit('stopped');
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            mode: this.mode,
            topic: this.currentTopic
        };
    }
}
