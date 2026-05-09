import fs from 'fs';
import path from 'path';
import { detectUserIntent } from '../src/core/conversation/conversation-quality';
import { routeRequest } from '../src/core/model-orchestration/router';
import { classifyTask } from '../src/core/nano-cognitive/service';

const cases = [
  { prompt: 'bana papatya görseli oluşturur musun', expectedIntent: 'image_generation', expectImageJob: true },
  { prompt: 'bana papatya görseli oluştutrur musun', expectedIntent: 'image_generation', expectImageJob: true },
  { prompt: 'bir kedi resmi yapar mısın', expectedIntent: 'image_generation', expectImageJob: true },
  { prompt: 'modern ai logosu olustur', expectedIntent: 'image_generation', expectImageJob: true },
  { prompt: 'görsel nedir', expectedIntent: 'general_knowledge', expectImageJob: false },
  { prompt: 'fotoğrafçılık nedir', expectedIntent: 'general_knowledge', expectImageJob: false },
  { prompt: 'mavi arka planlı modern ai logosu üret', expectedIntent: 'image_generation', expectImageJob: true },
  { prompt: 'doğada gün batımı görseli oluştur', expectedIntent: 'image_generation', expectImageJob: true },
];

const url = process.env.AILLAME_CHAT_URL || 'http://localhost:3000/api/core/chat';
const jobsFile = path.join(process.cwd(), '.aillame-data', 'image-jobs.jsonl');
const shouldWaitForJobs = process.env.AILLAME_WAIT_IMAGE_JOBS === '1';
const shouldUseApi = process.env.AILLAME_CHAT_IMAGE_INTENT_API === '1';

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
  console.log(shouldUseApi ? 'Testing Chat-to-Image Handoff API...' : 'Testing Chat-to-Image Intent Detection...');
  const failures: string[] = [];

  if (!shouldUseApi) {
    for (const tc of cases) {
      const intent = detectUserIntent(tc.prompt);
      const cognitivePlan = classifyTask(tc.prompt);
      const routePlan = routeRequest(tc.prompt);
      const ok = tc.expectImageJob
        ? intent === tc.expectedIntent && cognitivePlan.taskType === tc.expectedIntent && routePlan.intent === tc.expectedIntent
        : intent === tc.expectedIntent && cognitivePlan.taskType === tc.expectedIntent && routePlan.intent !== 'image_generation';

      console.log(`Prompt: "${tc.prompt}"`);
      console.log(` - conversationIntent: ${intent}`);
      console.log(` - cognitiveTask: ${cognitivePlan.taskType}`);
      console.log(` - routeIntent: ${routePlan.intent}`);
      console.log(` - Result: ${ok ? 'PASS' : 'FAIL'}\n`);

      if (!ok) failures.push(`${tc.prompt} -> ${JSON.stringify({ intent, taskType: cognitivePlan.taskType, routeIntent: routePlan.intent })}`);
    }

    if (failures.length > 0) {
      console.error('Final Result: FAIL');
      failures.forEach((failure) => console.error(` - ${failure}`));
      process.exit(1);
    }

    console.log('Final Result: PASS');
    return;
  }

  for (const tc of cases) {
    try {
      const { prompt } = tc;
      const data = await postChat(prompt);
      const responseText = String(data.response || '').toLocaleLowerCase('tr-TR');
      const intent = data.plan?.cognitivePlan?.taskType || data.plan?.intent;
      const positiveOk =
        data.imageJobId &&
        data.modelId === 'aillame-nano-v1-igm-handoff' &&
        intent === tc.expectedIntent &&
        data.runtimeAttribution?.provider === 'aillame-igm' &&
        !responseText.includes('yanıtı tamamlayamadı') &&
        !responseText.includes('konuyu önce sadeleştireyim') &&
        !responseText.includes('nano text');
      const negativeOk =
        !data.imageJobId &&
        intent === tc.expectedIntent &&
        !responseText.includes('konuyu önce sadeleştireyim');
      const ok = tc.expectImageJob ? positiveOk : negativeOk;

      const job = ok && tc.expectImageJob && shouldWaitForJobs ? await waitForJobTerminal(data.imageJobId) : null;
      const jobOk = tc.expectImageJob
        ? !shouldWaitForJobs || (job && ['completed', 'failed', 'not-configured'].includes(job.status) && (job.status !== 'failed' || job.errorSummary))
        : true;

      console.log(`Prompt: "${prompt}"`);
      console.log(` - imageJobId: ${data.imageJobId || 'missing'}`);
      console.log(` - modelId: ${data.modelId || 'missing'}`);
      console.log(` - intent: ${intent || 'missing'}`);
      console.log(` - jobStatus: ${shouldWaitForJobs ? job?.status || 'missing' : 'not-waited'}`);
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
