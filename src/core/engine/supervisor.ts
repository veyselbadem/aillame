import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let activeChild: any = null;

function startTraining() {
    console.log('🔄 Supervisor: Eğitim süreci başlatılıyor...');
    
    // Windows'ta npx çalıştırmak için .cmd uzantısı gerekebilir, shell: true bunu çözer
    const child = spawn('npx', ['tsx', path.join(__dirname, 'train-rust.ts')], { 
        stdio: 'inherit', 
        shell: true 
    });
    activeChild = child;

    child.on('close', (code) => {
        activeChild = null;
        if (code !== 0 && code !== null) {
            console.error(`\n⚠️ Sistem Uyarısı: Eğitim süreci çöktü (Exit Code: ${code}).`);
            console.log('⏳ Supervisor: 5 saniye içinde otomatik yeniden başlatılıyor...\n');
            setTimeout(startTraining, 5000);
        } else {
            console.log('✅ Eğitim başarıyla tamamlandı.');
        }
    });
}

function cleanupAndExit() {
    if (activeChild) {
        console.log('\n🛑 Supervisor kapatılıyor, alt süreç temizleniyor...');
        activeChild.kill('SIGKILL');
    }
    process.exit(0);
}

process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);
process.on('exit', cleanupAndExit);

startTraining();
