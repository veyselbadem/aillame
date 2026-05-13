import { AillamePromptBuildInput, AillameBuiltPrompt, AillamePromptMessage } from '../types/prompt.types';

export class PromptBuilderService {
  /**
   * Builds a structured prompt for the LLM.
   */
  static buildPrompt(input: AillamePromptBuildInput): AillameBuiltPrompt {
    const { message, context, project, memory } = input;
    const createdAt = new Date().toISOString();

    const messages: AillamePromptMessage[] = [];
    
    // 1. System Prompt
    const systemPrompt = this.buildSystemPrompt(project.projectName, project.mode, context?.taskType);
    messages.push({ role: "system", content: systemPrompt });

    // 2. Memory Section (Facts and Recent Messages)
    if (memory) {
      const memoryPrompt = this.buildMemoryPrompt(memory);
      if (memoryPrompt) {
        messages.push({ role: "system", content: memoryPrompt });
      }
    }

    // 3. Project Context (Files)
    if (context?.files && context.files.length > 0) {
      const contextPrompt = this.buildContextPrompt(context.files);
      messages.push({ role: "system", content: contextPrompt });
    }

    // 4. User Message
    messages.push({ role: "user", content: message });

    // 5. Generate Plain Text version
    const plainText = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n');

    return {
      messages,
      plainText,
      meta: {
        projectId: project.projectId,
        projectName: project.projectName,
        mode: project.mode,
        taskType: context?.taskType,
        source: context?.source || project.projectId,
        fileCount: context?.files?.length || 0,
        totalContextLength: plainText.length,
        memoryFactCount: memory?.facts?.length || 0,
        memoryRecentMessageCount: memory?.recentMessages?.length || 0,
        createdAt
      }
    };
  }

  private static buildSystemPrompt(projectName: string, mode: string, taskType?: string): string {
    return `You are Aillame, an AI assistant for the project "${projectName}". 
Current Mode: ${mode}
${taskType ? `Current Task: ${taskType}` : ""}

Strict Rules:
1. Always provide structured and accurate information.
2. If suggesting file changes, use a clear format or structured JSON if requested.
3. Be concise and professional.
4. Focus on the local development environment.`;
  }

  private static buildMemoryPrompt(memory: any): string | null {
    if (!memory) return null;
    
    let prompt = "MEMORY:\n";
    let hasContent = false;

    // Facts (limit to 20)
    if (memory.facts && memory.facts.length > 0) {
      prompt += "Facts:\n";
      memory.facts.slice(0, 20).forEach((f: any) => {
        prompt += `- ${f.text}\n`;
      });
      hasContent = true;
    }

    // Recent Messages (limit to 10)
    if (memory.recentMessages && memory.recentMessages.length > 0) {
      prompt += "\nRecent Messages:\n";
      memory.recentMessages.slice(-10).forEach((m: any, index: number) => {
        const truncatedContent = m.content.length > 1000 ? m.content.substring(0, 1000) + "..." : m.content;
        prompt += `${index + 1}. ${m.role.toUpperCase()}: ${truncatedContent}\n`;
      });
      hasContent = true;
    }

    return hasContent ? prompt : null;
  }

  private static buildContextPrompt(files: any[]): string {
    let prompt = "PROJECT CONTEXT:\nRelevant files are provided below:\n\n";
    files.forEach(file => {
      prompt += `FILE: ${file.path}\n`;
      prompt += "```" + (file.language || "") + "\n";
      prompt += file.content + "\n";
      prompt += "```\n\n";
    });
    return prompt;
  }
}
