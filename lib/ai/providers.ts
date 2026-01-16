import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// GitHub Copilot uses OpenAI's API under the hood
// We'll use OpenAI's API with the user's GitHub Copilot token
// Note: This requires users to connect their GitHub Copilot subscription
// via device login and store their token

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : (() => {
      // For now, using OpenAI's API as GitHub Copilot is built on OpenAI
      // In production, this should use the user's GitHub Copilot token
      // obtained via device login
      const base = customProvider({
        languageModels: {
          'chat-model': openai('gpt-4o'),
          'chat-model-reasoning': wrapLanguageModel({
            model: openai('gpt-4o'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          }),
          'title-model': openai('gpt-4o-mini'),
          'artifact-model': openai('gpt-4o'),
          'github-copilot': openai('gpt-4o'), // Placeholder - should use user's Copilot token
        },
      });

      return {
        ...base,
        languageModel(id: string) {
          try {
            // attempt predefined
            // @ts-ignore – type narrowed in runtime
            return base.languageModel(id);
          } catch {
            // Fallback to default model
            return base.languageModel('chat-model');
          }
        },
      } as typeof base;
    })();
