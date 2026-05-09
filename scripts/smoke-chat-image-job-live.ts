import fs from 'fs';
import path from 'path';

async function pollJobStatus(jobId: string, timeoutMs: number = 300000): Promise<any> {
  const dataDir = path.join(process.cwd(), '.aillame-data');
  const jobsFile = path.join(dataDir, 'image-jobs.jsonl');
  const startTime = Date.now();

  console.log(`Polling job ${jobId} status from ${jobsFile}...`);

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(jobsFile)) {
      const content = fs.readFileSync(jobsFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const job = JSON.parse(lines[i]);
          if (job.jobId === jobId) {
            console.log(`Current status: ${job.status} (Progress: ${job.progress}%)`);
            if (job.status === 'completed' || job.status === 'failed' || job.status === 'not-configured') {
              return job;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`Job ${jobId} timed out after ${timeoutMs/1000}s`);
}

async function testImageJobLive() {
  console.log("Aillame Chat-to-Image REAL PRODUCTION VERIFICATION\n");
  
  const prompt = "bana papatya görseli oluşturur musun";
  const url = 'http://localhost:3000/api/core/chat';

  try {
    console.log(`Sending prompt: "${prompt}" to ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Chat Response:", data.response.substring(0, 100) + "...");
    
    if (!data.imageJobId || data.modelId !== 'aillame-nano-v1-igm-handoff') {
      throw new Error("Chat response did not contain an imageJobId. Intent detection might have failed.");
    }

    const jobId = data.imageJobId;
    console.log(`\n[STEP 1] Handoff successful. Job ID: ${jobId}`);

    // Wait for job execution
    const jobResult = await pollJobStatus(jobId);
    
    if (jobResult.status === 'completed') {
      console.log(`\n[STEP 2] Job completed successfully!`);
      console.log(`Device: ${jobResult.device || 'unknown'} (${jobResult.deviceDetails || 'no details'})`);
      
      if (jobResult.outputAssetIds && jobResult.outputAssetIds.length > 0) {
        const assetId = jobResult.outputAssetIds[0];
        console.log(`Asset ID: ${assetId}`);
        
        // Check asset store
        const assetFile = path.join(process.cwd(), '.aillame-data', 'image-assets.jsonl');
        const assetContent = fs.readFileSync(assetFile, 'utf8');
        if (assetContent.includes(assetId)) {
          console.log(`[STEP 3] Asset record found in store.`);
          
          // Check physical file
          const assetData = assetContent.split('\n').filter(l => l.includes(assetId)).map(l => JSON.parse(l))[0];
          const physicalFile = path.join(process.cwd(), '.aillame-data', 'assets', 'images', assetData.fileName);
          if (fs.existsSync(physicalFile)) {
            const stats = fs.statSync(physicalFile);
            if (stats.size <= 0) {
              throw new Error(`Physical file exists but is empty: ${physicalFile}`);
            }
            console.log(`[STEP 4] Physical file exists: ${path.basename(physicalFile)} (${stats.size} bytes)`);
            console.log(`\n[FINAL] PASS: Real image generated and persisted via Chat Handoff.`);
          } else {
            throw new Error(`Physical file missing at ${physicalFile}`);
          }
        } else {
          throw new Error(`Asset ${assetId} not found in ${assetFile}`);
        }
      } else {
        throw new Error("Job completed but no outputAssetIds found.");
      }
    } else {
      console.error(`\n[STEP 2] Job FAILED.`);
      console.error(`Status: ${jobResult.status}`);
      console.error(`Error: ${jobResult.errorSummary || 'No error details'}`);
      process.exit(1);
    }

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.error("\n[FAIL] Server not running on localhost:3000. Start the server to run live verification.");
      process.exit(1);
    } else {
      console.error("\n[ERROR] Verification failed:", error.message);
      process.exit(1);
    }
  }
}

testImageJobLive();
