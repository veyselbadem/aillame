import fs from 'fs';
import path from 'path';

const prompts = [
  'bana papatya görseli oluşturur musun',
  'bir kedi resmi yap',
  'mavi arka planlı modern ai logosu üret',
  'doğada gün batımı görseli oluştur',
];

const url = process.env.AILLAME_CHAT_URL || 'http://localhost:3000/api/core/chat';
const jobsFile = path.join(process.cwd(), '.aillame-data', 'image-jobs.jsonl');

async function waitForJobTerminal(jobId: string, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(jobsFile)) {
      const lines = fs.readFileSync(jobsFile, 'utf8').split('\n').filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const job = JSON.parse(lines[i]);
        if (job.jobId === jobId) {
          if (['completed', 'failed', 'not-configured'].includes(job.status)) return job;
          if (job.status === 'running') console.log(`   status: running (${job.progress || 0}%)`);
          break;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for ${jobId}`);
}

async function postChat(prompt: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('Testing Chat-to-Image Handoff API...');
  const failures: string[] = [];

  for (const prompt of prompts) {
    try {
      const data = await postChat(prompt);
      const responseText = String(data.response || '').toLocaleLowerCase('tr-TR');
      const intent = data.plan?.cognitivePlan?.taskType || data.plan?.intent;
      const ok =
        data.imageJobId &&
        data.modelId === 'aillame-nano-v1-igm-handoff' &&
        intent === 'image_generation' &&
        data.runtimeAttribution?.provider === 'aillame-igm' &&
        !responseText.includes('yanıtı tamamlayamadı') &&
        !responseText.includes('nano text');

      const job = ok ? await waitForJobTerminal(data.imageJobId) : null;
      const jobOk = job && ['completed', 'failed', 'not-configured'].includes(job.status) && (job.status !== 'failed' || job.errorSummary);

      console.log(`Prompt: "${prompt}"`);
      console.log(` - imageJobId: ${data.imageJobId || 'missing'}`);
      console.log(` - modelId: ${data.modelId || 'missing'}`);
      console.log(` - intent: ${intent || 'missing'}`);
      console.log(` - jobStatus: ${job?.status || 'missing'}`);
      if (job?.status === 'failed') console.log(` - jobError: ${job.errorSummary || 'missing'}`);
      console.log(` - Result: ${ok && jobOk ? 'PASS' : 'FAIL'}\n`);

      if (!ok || !jobOk) failures.push(`${prompt} -> ${JSON.stringify({ data, job }).slice(0, 700)}`);
    } catch (error: any) {
      failures.push(`${prompt} -> ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error('Final Result: FAIL');
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('Final Result: PASS');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
