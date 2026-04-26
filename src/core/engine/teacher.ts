import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TeacherConfig {
    status: 'running' | 'stopped';
    topics: string[];
    currentTopic: string;
    lastUpdate: number;
    intervalMinutes: number;
}

const CONFIG_PATH = path.join(__dirname, 'teacher-config.json');
const DATA_PATH = path.join(__dirname, 'data', 'input.txt');

const DEFAULT_CONFIG: TeacherConfig = {
    status: 'running',
    topics: ["Uzay Bilimi", "Osmanlı Denizciliği", "Biyoteknoloji", "Modern Psikoloji", "Antik Felsefe"],
    currentTopic: "",
    lastUpdate: 0,
    intervalMinutes: 1 // Test için 1 dakika (Normalde 30-60 olabilir)
};

// Bilgi bankası (Gerçekte bir LLM API'sine bağlanabilir)
const KNOWLEDGE_BANK: { [key: string]: string[] } = {
    "Borsa Analizi": [
        "Teknik analizde mum grafikleri, fiyat hareketlerini ve piyasa psikolojisini anlamak için temeldir.",
        "RSI (Göreceli Güç Endeksi), bir hissenin aşırı alım veya aşırı satım bölgesinde olup olmadığını gösterir.",
        "Temel analiz, bir şirketin finansal tablolarını, yönetim kalitesini ve sektördeki konumunu incelemeyi kapsar.",
        "Destek ve direnç seviyeleri, yatırımcıların alım-satım kararlarını yoğunlaştırdığı psikolojik sınırlardır."
    ],
    "Eğitim Bilimleri (Soru Hazırlama)": [
        "İlkokul düzeyinde sorular somut örneklerle ve basit bir dille oluşturulmalıdır.",
        "Ortaokul düzeyinde sorular, mantıksal çıkarım ve neden-sonuç ilişkilerini test etmeye başlamalıdır.",
        "Lise düzeyinde sorular, soyut düşünme yeteneğini ve derinlemesine konu analizini hedeflemelidir.",
        "Bloom Taksonomisi, bilgi düzeyinden değerlendirme düzeyine kadar farklı bilişsel seviyelerde soru hazırlamayı sağlar."
    ],
    "Oyun Geliştirme": [
        "Oyun döngüsü (Game Loop), her karede girişleri okuyan, dünyayı güncelleyen ve görüntüyü çizen temel yapıdır.",
        "Varlık yönetimi (Entity-Component System), oyun nesnelerinin davranışlarını esnek bir şekilde modüler hale getirir.",
        "Fizik motorları, çarpışma algılama ve yerçekimi gibi gerçek dünya etkilerini simüle eder.",
        "TypeScript ve Rust, yüksek performanslı ve bellek güvenli oyun motorları geliştirmek için modern tercihlerdir."
    ]
};

async function solveTeacherStep() {
    if (!fs.existsSync(CONFIG_PATH)) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    }

    const config: TeacherConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    if (config.status === 'stopped') {
        console.log('💤 Hoca şu an istirahatte. (Durum: stopped)');
        return;
    }

    const now = Date.now();
    const intervalMs = config.intervalMinutes * 60 * 1000;

    if (now - config.lastUpdate < intervalMs && config.topics.length === 0) {
        return;
    }

    // Yeni konu seç
    let topicToTrain = "";
    if (config.topics.length > 0) {
        topicToTrain = config.topics.shift()!; // Kullanıcının verdiği ilk konuyu al
        console.log(`🎯 Özel Konu Eğitimi: ${topicToTrain}`);
    } else {
        const availableTopics = Object.keys(KNOWLEDGE_BANK);
        topicToTrain = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        console.log(`🤖 Otomatik Konu Eğitimi: ${topicToTrain}`);
    }

    // Bilgi üret (Knowledge bank'ten veya sentetik)
    const lessons = KNOWLEDGE_BANK[topicToTrain] || [
        `${topicToTrain} konusu üzerine derin araştırmalar devam ediyor.`,
        `${topicToTrain} alanında yeni keşifler Aillame'nin ufkunu açacaktır.`
    ];

    const lessonText = `\n[HOCA DERSİ: ${topicToTrain}]\n` + lessons.join('\n') + '\n';
    
    // input.txt'ye ekle
    fs.appendFileSync(DATA_PATH, lessonText);
    
    // Config güncelle
    config.currentTopic = topicToTrain;
    config.lastUpdate = now;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log(`✅ Aillame'ye yeni ders verildi: ${topicToTrain}`);
}

// Periyodik kontrol
console.log('👩‍🏫 Nöbetçi Hoca Göreve Başladı...');
setInterval(solveTeacherStep, 10000); // 10 saniyede bir kontrol et
solveTeacherStep();
