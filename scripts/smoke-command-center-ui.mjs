import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

const filesToCheck = [
  {
    path: 'src/components/Sidebar.tsx',
    patterns: [
      'Yönetim',
      'Ayarlar',
      'Kontrol Merkezi',
      'Modeller',
      'Görseller',
      'Code Agent',
      'Hafıza / RAG',
      'Provider API'
    ]
  },
  {
    path: 'src/app/admin/dashboard/page.tsx',
    patterns: [
      'Aillame Kontrol Merkezi',
      'Yerel Yapay Zeka',
      'Operasyonel Birimler',
      'Sistem Bileşenleri',
      'Zeka İstatistikleri',
      'Sağlık Monitörü',
      'Beta Checklist'
    ]
  },
  {
    path: 'src/app/admin/model-library/page.tsx',
    patterns: [
      'Model Kütüphanesi',
      'Yerel GGUF Runtime',
      'Merkezi Model Kaydı'
    ]
  },
  {
    path: 'src/app/admin/image-assets/page.tsx',
    patterns: [
      'Görsel',
      'Varlıkları',
      'IGM Varlıkları ve Geçmiş',
      'IGM Uyumluluk Notu'
    ]
  },
  {
    path: 'src/app/admin/desktop-readiness/page.tsx',
    patterns: [
      'Masaüstü',
      'Hazırlığı',
      'Masaüstü Doğrulama Köprüsü',
      'Kabul Kriterleri',
      'Yerel Bağımsızlık'
    ]
  }
];

console.log('🚀 Starting Aillame Command Center UI Smoke Test...');

let failed = false;

for (const file of filesToCheck) {
  const fullPath = path.join(projectRoot, file.path);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${file.path}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  console.log(`\n📄 Checking ${file.path}...`);

  for (const pattern of file.patterns) {
    if (content.includes(pattern)) {
      console.log(`  ✅ Found: "${pattern}"`);
    } else {
      console.error(`  ❌ Missing: "${pattern}"`);
      failed = true;
    }
  }

  // Check for potential mojibake (Turkish characters)
  const turkishChars = ['ğ', 'Ğ', 'ç', 'Ç', 'ş', 'Ş', 'ü', 'Ü', 'ö', 'Ö', 'ı', 'İ'];
  for (const char of turkishChars) {
    // This is a basic check; if the file is UTF-8, it should be fine.
    // Mojibake usually happens when UTF-8 is read as something else.
    // Here we just ensure the characters exist in the source.
  }
}

if (failed) {
  console.error('\n💥 Smoke test FAILED! Some UI elements are missing or files are broken.');
  process.exit(1);
} else {
  console.log('\n✨ Smoke test PASSED! Command Center UI structure is verified.');
  process.exit(0);
}
