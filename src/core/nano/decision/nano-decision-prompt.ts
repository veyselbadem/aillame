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
    "Allowed taskType: chat,text,code,analysis,image,vision,agent,mixed,unknown,game_design,game_scene,game_asset,game_script,game_error_fix,engine_query.",
    "Allowed contentType: text,image,code,project,mixed.",
    "Allowed outputType: text,image,json,patch,report,mixed.",
    "Allowed domain: general,education,code,economy.",
    "Allowed capabilities: text-generation,chat,code-generation,analysis,image-generation,image-understanding,agent-task,game-design,game-scene-planning,game-asset-planning,game-scripting,game-debugging,engine-knowledge.",
    "",
    "Examples:",
    "Input: {\"prompt\":\"Platform oyunu tasarla\",\"projectId\":\"doomsgame-engine\"}",
    "JSON: {\"taskType\":\"game_design\",\"contentType\":\"text\",\"outputType\":\"text\",\"domain\":\"general\",\"requiredCapabilities\":[\"text-generation\",\"analysis\",\"game-design\"],\"decision\":\"Game design plan requested.\"}",
    "",
    "Input: {\"prompt\":\"Engine API nedir?\",\"projectId\":\"doomsgame-engine\"}",
    "JSON: {\"taskType\":\"engine_query\",\"contentType\":\"text\",\"outputType\":\"text\",\"domain\":\"code\",\"requiredCapabilities\":[\"text-generation\",\"analysis\",\"engine-knowledge\"],\"decision\":\"Engine API query identified.\"}",
    "",
    `Input: ${requestJson}`,
    "JSON:",
  ].join("\n");
}
