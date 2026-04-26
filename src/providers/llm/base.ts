import type { ImageAttachment } from '@apptypes/attachments';

export interface LLMGenerateOptions {
  images?: ImageAttachment[];
}

export interface LLMProvider {
  loadModel(): Promise<void>;
  isLoading(): boolean;
  isReady(): boolean;
  generate(
    prompt: string, 
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMGenerateOptions
  ): Promise<string | void>;
  analyze?(file: any): Promise<any>;
}
