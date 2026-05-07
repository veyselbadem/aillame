export type NanoDecisionPromptInput = {
  prompt: string;
  projectId?: string;
  mode?: string;
};

export function buildNanoDecisionPrompt(input: NanoDecisionPromptInput): string {
  const requestJson = JSON.stringify({
    prompt: input.prompt,
    projectId: input.projectId ?? null,
    mode: input.mode ?? null,
  });

  return [
    "Task: classify Aillame request. Return ONLY compact JSON.",
    "Keys: taskType, contentType, outputType, domain, requiredCapabilities, decision.",
    "Allowed taskType: chat,text,code,analysis,image,vision,agent,mixed,unknown.",
    "Allowed contentType: text,image,code,project,mixed.",
    "Allowed outputType: text,image,json,patch,report,mixed.",
    "Allowed domain: general,education,code,economy.",
    "Allowed capabilities: text-generation,chat,code-generation,analysis,image-generation,image-understanding,agent-task.",
    `Input: ${requestJson}`,
    "JSON:",
  ].join("\n");
}
