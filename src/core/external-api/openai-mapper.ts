type OpenAIModelRecord = {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
};

type OpenAIModelList = {
  object: 'list';
  data: OpenAIModelRecord[];
};

type OpenAIChatCompletionInput = {
  model: string;
  content: string;
  warnings?: string[];
};

type OpenAIChatCompletion = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function createChatCompletionId(): string {
  return `chatcmpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toOpenAIModelList(models: Array<{ id: string }>): OpenAIModelList {
  return {
    object: 'list',
    data: models.map((model) => ({
      id: model.id,
      object: 'model',
      created: 0,
      owned_by: 'aillame',
    })),
  };
}

export function toOpenAIChatCompletion(input: OpenAIChatCompletionInput): OpenAIChatCompletion {
  const warningBlock = input.warnings && input.warnings.length > 0
    ? `\n\n[Warnings]\n${input.warnings.join('\n')}`
    : '';

  return {
    id: createChatCompletionId(),
    object: 'chat.completion',
    created: nowUnixSeconds(),
    model: input.model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `${input.content}${warningBlock}`,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}
