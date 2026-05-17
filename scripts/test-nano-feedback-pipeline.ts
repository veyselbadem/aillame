import { NanoFeedbackStoreService } from '../src/core/nano/learning/nano-feedback-store.service';
import { NanoTrainingCandidateBuilder } from '../src/core/nano/learning/nano-training-candidate-builder';
import { NanoFeedbackRecord } from '../src/core/nano/learning/nano-feedback.types';

async function testFeedbackPipeline() {
    console.log("--- AILLAME NANO FEEDBACK PIPELINE TEST ---");

    const mockRecord: NanoFeedbackRecord = {
        feedbackId: "fb_test_1",
        taskId: "task_1",
        planId: "plan_1",
        timestamp: new Date().toISOString(),
        source: 'execution_result',
        language: 'tr',
        userMessageSummary: "Gizli şifrem: sk-1234567890abcdef1234567890abcdef ve dosya yolum C:\\Users\\admin\\Desktop\\secrets.txt. Türkçe karakter: ç, ğ, ı, İ, ö, ş, ü",
        intent: 'chat',
        requiredCapabilities: ['text.general'],
        selectedCapabilities: ['text.general'],
        selectedModels: ['qwen2.5'],
        executionSummary: {
            stepsTotal: 1,
            stepsSucceeded: 1,
            stepsDegraded: 0,
            stepsFailed: 0,
            blocked: false,
            fallbackUsed: false,
            missingCapabilities: [],
            errorCodes: [],
            latencyMs: 150
        },
        qualitySignals: ['success'],
        safetyFlags: [],
        safeForTraining: false,
        requiresReview: true,
        redactionStatus: 'clean',
        schemaVersion: '1.0.0'
    };

    console.log("\nRecording feedback with sensitive data...");
    await NanoFeedbackStoreService.recordFeedback(mockRecord);
    console.log("- Feedback recorded. (Check .aillame-data/nano-feedback/feedback.jsonl for redaction)");

    const candidate = NanoTrainingCandidateBuilder.buildCandidate(mockRecord);
    console.log("\nTraining Candidate built:");
    console.log(`- safeForTraining: ${candidate.safeForTraining} (Expected: false)`);
    console.log(`- tags: ${candidate.tags.join(', ')}`);

    console.log("\nPipeline test complete.");
}

testFeedbackPipeline().catch(console.error);
