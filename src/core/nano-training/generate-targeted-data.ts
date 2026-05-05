// [NANO-F6] Hedefli sentetik veri sentezi
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_PATH = path.join(process.cwd(), 'src', 'core', 'nano-training', 'targeted-v2-data.jsonl');

const TOPICS = [
  { topic: 'JavaScript', content: 'JavaScript, web geliştirme için kullanılan dinamik bir dildir.' },
  { topic: 'React', content: 'React, kullanıcı arayüzleri oluşturmak için kullanılan bir kütüphanedir.' },
  { topic: 'Node.js', content: 'Node.js, JavaScript\'i sunucu tarafında çalıştırmayı sağlar.' },
  { topic: 'TypeScript', content: 'TypeScript, JavaScript\'e tip güvenliği ekleyen bir üst kümedir.' },
  { topic: 'Python', content: 'Python, veri bilimi ve yapay zeka için popüler bir dildir.' },
  { topic: 'Rust', content: 'Rust, performans ve güvenlik odaklı bir sistem programlama dilidir.' },
  { topic: 'Docker', content: 'Docker, uygulamaları konteynerlar içinde çalıştırmayı sağlar.' },
  { topic: 'Kubernetes', content: 'Kubernetes, konteynerize edilmiş uygulamaları yönetmek için kullanılır.' },
  { topic: 'Deep Learning', content: 'Derin öğrenme, yapay sinir ağlarını kullanarak veri analizi yapmaktır.' },
  { topic: 'Machine Learning', content: 'Makine öğrenmesi, bilgisayarların veriden öğrenmesini sağlayan bir alandır.' }
];

const QUESTION_TEMPLATES = [
  "{topic} nedir?",
  "{topic} hakkında bilgi ver.",
  "{topic} ne işe yarar?",
  "Bana {topic} açıklar mısın?",
  "{topic} teknolojisini tanımla."
];

function generateData() {
  console.log('[NANO-F6] Sentetik veri sentezi başlıyor...');
  const examples: string[] = [];

  for (const item of TOPICS) {
    for (const template of QUESTION_TEMPLATES) {
      const question = template.replace('{topic}', item.topic);
      const entry = {
        text: `### Kullanıcı: ${question}\n### Asistan: ${item.content}`,
        metadata: { source: 'synthetic_targeted', topic: item.topic }
      };
      examples.push(JSON.stringify(entry));
    }
  }

  // Biraz daha karmaşık karşılaştırmalar ekleyelim
  const comparisons = [
    { a: 'JavaScript', b: 'TypeScript', diff: 'TypeScript statik tiplere sahipken, JavaScript dinamiktir.' },
    { a: 'Python', b: 'Rust', diff: 'Python geliştirme hızı sunar, Rust ise maksimum performans sağlar.' },
    { a: 'React', b: 'Vue', diff: 'React kütüphane tabanlıdır, Vue ise daha bütünleşik bir frameworktür.' }
  ];

  for (const comp of comparisons) {
    const entry = {
      text: `### Kullanıcı: ${comp.a} ve ${comp.b} arasındaki fark nedir?\n### Asistan: ${comp.diff}`,
      metadata: { source: 'synthetic_targeted', type: 'comparison' }
    };
    examples.push(JSON.stringify(entry));
  }

  fs.writeFileSync(OUTPUT_PATH, examples.join('\n') + '\n', 'utf-8');
  console.log(`[NANO-F6] ✅ ${examples.length} yeni örnek sentezlendi: ${OUTPUT_PATH}`);
}

generateData();
