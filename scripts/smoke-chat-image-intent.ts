async function testImageHandoff() {
  console.log("Testing Chat-to-Image Handoff API...");
  
  const prompt = "bana papatya görseli oluşturur musun";
  const url = 'http://localhost:3000/api/core/chat'; // Assuming it's running locally

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });
    
    console.log("Response Status:", response.status);
    const data = await response.json();
    console.log("Response Data:", JSON.stringify(data, null, 2));
    
    if (data.imageJobId && data.modelId === 'aillame-nano-v1-igm-handoff') {
      console.log("\n[PASS] Handoff successful!");
      console.log("Job ID:", data.imageJobId);
    } else {
      console.log("\n[FAIL] Handoff failed or modelId mismatch.");
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      console.log("\n[SKIP] Server not running on localhost:3000. Skipping live API check.");
    } else {
      console.error("\n[ERROR] API call failed:", error.message);
    }
  }
}

testImageHandoff();
