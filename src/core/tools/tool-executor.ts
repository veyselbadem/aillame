import { TOOL_REGISTRY } from './tool-registry';
import { AillameToolResult, AillameToolContext } from './types';

export const AillameToolExecutor = {
  async executeTool(
    toolId: string,
    input: any,
    context: AillameToolContext = {},
    timeoutMs: number = 5000
  ): Promise<AillameToolResult & { toolId: string; riskLevel: string }> {
    console.log(`[AillameToolExecutor] Executing tool: ${toolId} (Risk Check Started)`);

    const tool = TOOL_REGISTRY[toolId];
    if (!tool) {
      console.warn(`[AillameToolExecutor] Tool not found: ${toolId}`);
      return {
        ok: false,
        toolId,
        riskLevel: 'unknown',
        errors: [`Bilinmeyen veya sisteme kayıtlı olmayan araç kimliği: ${toolId}`]
      };
    }

    // 1. Blocked Risk Level Check
    if (tool.riskLevel === 'blocked') {
      console.warn(`[AillameToolExecutor] Blocked tool execution attempt: ${toolId}`);
      return {
        ok: false,
        toolId,
        riskLevel: 'blocked',
        errors: [`Bu araç (${tool.name}) güvenlik politikaları nedeniyle kalıcı olarak engellenmiştir.`]
      };
    }

    // 2. Confirm Required Check (Disabled in MVP)
    if (tool.riskLevel === 'confirm_required' || tool.requiresUserConfirmation) {
      console.warn(`[AillameToolExecutor] Tool requires user confirmation (MVP Bypass): ${toolId}`);
      return {
        ok: false,
        toolId,
        riskLevel: 'confirm_required',
        warnings: [`Bu işlem (${tool.name}) kullanıcı onayı gerektirir. MVP aşamasında otomatik çalıştırılamaz.`]
      };
    }

    // 3. Safe Execution with Timeout Guard
    try {
      console.log(`[AillameToolExecutor] Safe tool identified. Launching execution: ${toolId}`);
      
      const executionPromise = tool.execute(input, context);
      
      const timeoutPromise = new Promise<AillameToolResult>((_, reject) =>
        setTimeout(() => reject(new Error('İşlem zaman aşımına uğradı (Timeout).')), timeoutMs)
      );

      const result = await Promise.race([executionPromise, timeoutPromise]);

      console.log(`[AillameToolExecutor] Tool executed successfully: ${toolId}`);
      return {
        ...result,
        toolId,
        riskLevel: tool.riskLevel
      };
    } catch (err: any) {
      console.error(`[AillameToolExecutor] Error during tool execution: ${toolId}`, err.message);
      return {
        ok: false,
        toolId,
        riskLevel: tool.riskLevel,
        errors: [`Araç çalıştırma sırasında beklenmeyen hata oluştu: ${err.message}`]
      };
    }
  }
};
