export const DEFAULT_CHAT_MODEL: string = 'openai/gpt-4o';

// Legacy interface kept for compatibility in parts of the codebase that may still
// import it. The new model selector fetches models dynamically, so this list is
// no longer used at runtime.

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: DEFAULT_CHAT_MODEL,
    name: 'GPT-4o',
    description: 'OpenAI flagship model (OpenRouter)',
  },
];
