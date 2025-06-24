import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

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
      const base = customProvider({
        languageModels: {
          'chat-model': openrouter('openai/gpt-4o'),
          'chat-model-reasoning': wrapLanguageModel({
            model: openrouter('anthropic/claude-3-5-sonnet'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          }),
          'title-model': openrouter('openai/gpt-4o-mini'),
          'artifact-model': openrouter('openai/gpt-4o'),
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
            return openrouter(id);
          }
        },
      } as typeof base;
    })();
