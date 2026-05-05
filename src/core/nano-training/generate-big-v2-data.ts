// [NANO-F6] 10,000 Örnekli Büyük Veri Seti Üretici
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_PATH = path.join(process.cwd(), 'src', 'core', 'nano-training', 'big-v2-data.jsonl');

const TOPICS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Next.js', 'Rust', 'Python', 'Go', 'C++', 'Java',
  'HTML', 'CSS', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS',
  'Yapay Zeka', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Transformer', 'GPT',
  'Ekonomi', 'Enflasyon', 'Borsa', 'Kripto Para', 'Blockchain', 'Ethereum', 'Bitcoin',
  'Tarih', 'Osmanlı İmparatorluğu', 'Antik Yunan', 'Roma İmparatorluğu', 'Rönesans', 'Sanayi Devrimi',
  'Coğrafya', 'Türkiye', 'Avrupa', 'Asya', 'Amerika', 'Okyanuslar', 'Dağlar', 'İklim Değişikliği',
  'Fizik', 'Kuantum Fiziği', 'İzafiyet Teorisi', 'Astronomi', 'Kara Delikler', 'Mars', 'Güneş Sistemi',
  'Biyoloji', 'Genetik', 'Evrim', 'Hücre', 'Virüsler', 'Bakteriler', 'Tıp', 'Sağlık',
  'Felsefe', 'Varoluşçuluk', 'Stoacılık', 'Etik', 'Mantık', 'Psikoloji', 'Sosyoloji',
  'Mutfak', 'Türk Mutfağı', 'İtalyan Mutfağı', 'Fransız Mutfağı', 'Kahve', 'Gastronomi',
  'Spor', 'Futbol', 'Basketbol', 'Tenis', 'Olimpiyatlar', 'Formula 1',
  'Müzik', 'Klasik Müzik', 'Caz', 'Rock', 'Pop', 'Enstrümanlar', 'Piyano', 'Gitar',
  'Sinema', 'Yönetmenler', 'Senaryo', 'Animasyon', 'Netflix', 'Hollywood'
];

const TEMPLATES = [
  "### Kullanıcı: {topic} nedir?\n### Asistan: {topic}, {description}.",
  "### Kullanıcı: {topic} hakkında bilgi verir misin?\n### Asistan: {topic} konusunda şunlar söylenebilir: {description}.",
  "### Kullanıcı: {topic} neden önemlidir?\n### Asistan: {topic} önemlidir çünkü {description}.",
  "### Kullanıcı: {topic} temel özellikleri nelerdir?\n### Asistan: {topic} temel özellikleri şunlardır: {description}.",
  "### Kullanıcı: Bana {topic} konusunu açıkla.\n### Asistan: Elbette, {topic} {description}."
];

const DESCRIPTIONS: Record<string, string[]> = {
  'JavaScript': ['modern web uygulamalarının temel taşıdır', 'etkileşimli web siteleri yapmanızı sağlar', 'hem frontend hem backend tarafında kullanılabilir'],
  'React': ['Facebook tarafından geliştirilen bir UI kütüphanesidir', 'bileşen tabanlı mimarisi ile kodun tekrar kullanılabilirliğini artırır', 'Virtual DOM kullanarak yüksek performans sağlar'],
  'Rust': ["bellek güvenliği ve performansı bir arada sunan bir dildir", "C++'a alternatif olarak geliştirilmiştir", "sahiplik (ownership) sistemi ile hata payını minimize eder"],
  'Yapay Zeka': ['bilgisayarların insan zekasını taklit etmesini sağlayan teknolojidir', 'günümüzde tıp, finans ve eğitim gibi birçok alanda kullanılmaktadır', 'derin öğrenme ve makine öğrenmesi alt dallarına ayrılır'],
  'Türkiye': ['Asya ve Avrupa kıtalarını birbirine bağlayan stratejik bir konumdadır', 'zengin bir kültürel mirasa ve köklü bir tarihe sahiptir', 'genç ve dinamik nüfusu ile gelişmekte olan bir ekonomidir'],
};

function generateBigData() {
  console.log('[NANO-F6] 10,000 örnekli veri sentezi başlıyor...');
  const examples: string[] = [];
  const targetCount = 10000;

  let count = 0;
  while (count < targetCount) {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    const descriptions = DESCRIPTIONS[topic] || [`${topic} alanında uzmanlaşmış bir bilgi birikimine ve geniş bir kullanım alanına sahiptir`];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    const text = template.replace(/{topic}/g, topic).replace('{description}', description);
    
    // Varyasyon ekleyelim (farklı sonlar)
    const variations = ['', '.', '!', '...'];
    const variation = variations[Math.floor(Math.random() * variations.length)];
    
    examples.push(JSON.stringify({ 
      text: text + variation,
      metadata: { source: 'big_synthetic', topic, id: count } 
    }));
    
    count++;
    if (count % 1000 === 0) console.log(`[NANO-F6] ${count} örnek oluşturuldu...`);
  }

  fs.writeFileSync(OUTPUT_PATH, examples.join('\n') + '\n', 'utf-8');
  console.log(`[NANO-F6] ✅ 10,000 örnek başarıyla sentezlendi: ${OUTPUT_PATH}`);
}

generateBigData();
