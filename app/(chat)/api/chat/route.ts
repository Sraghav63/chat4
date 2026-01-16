import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
} from 'ai';
import { auth, currentUser } from '@clerk/nextjs/server';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  syncClerkUser,
} from '@/lib/db/queries';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { getStocks } from '@/lib/ai/tools/get-stocks';
import { webSearch } from '@/lib/ai/tools/web-search';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { defaultEntitlements } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import type { Chat } from '@/lib/db/schema';
import { differenceInSeconds } from 'date-fns';
import { ChatSDKError } from '@/lib/errors';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      // Resumable streams disabled - using Convex instead of Redis
      console.log(' > Resumable streams are disabled (using Convex)');
      if (!error.message.includes('REDIS_URL')) {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const { id, message, selectedVisibilityType } =
      requestBody;

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Sync Clerk user with database
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const dbUser = await syncClerkUser(
      clerkUserId,
      clerkUser.emailAddresses[0]?.emailAddress || '',
    );

    const messageCount = await getMessageCountByUserId({
      id: dbUser.id,
      differenceInHours: 24,
    });

    if (messageCount > defaultEntitlements.maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: dbUser.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== dbUser.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const isMessageSaved = previousMessages.some(
      (dbMessage) => dbMessage.id === message.id,
    );

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      message,
    });

    // Convert any remote image attachments on the latest user message to base64 Data URLs – this improves
    // compatibility with providers like OpenRouter that currently expect inline data for vision inputs.
    async function inlineImageAttachments(msgs: typeof messages) {
      return Promise.all(
        msgs.map(async (m) => {
          if (!('experimental_attachments' in m) || !m.experimental_attachments?.length) {
            return m;
          }

          const processed = await Promise.all(
            m.experimental_attachments.map(async (att) => {
              if (
                (att.contentType?.startsWith('image/') || att.contentType === 'application/pdf') &&
                att.url &&
                !att.url.startsWith('data:')
              ) {
                try {
                  const res = await fetch(att.url);
                  const blob = await res.arrayBuffer();
                  const base64 = Buffer.from(blob).toString('base64');
                  return {
                    ...att,
                    url: `data:${att.contentType};base64,${base64}`,
                  };
                } catch (err) {
                  console.error('Failed to inline attachment', err);
                }
              }
              return att;
            }),
          );

          return {
            ...m,
            experimental_attachments: processed,
          } as typeof m;
        }),
      );
    }

    const processedMessages = await inlineImageAttachments(messages);

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (!isMessageSaved) {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: 'user',
            parts: message.parts,
            attachments: message.experimental_attachments ?? [],
            createdAt: new Date(),
            modelId: 'github-copilot',
          },
        ],
      });
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel('github-copilot'),
          system: systemPrompt({ selectedChatModel: 'github-copilot', requestHints }),
          messages: processedMessages,
          maxSteps: 5,
          experimental_activeTools: [
            'webSearch',
            'getWeather', 
            'getStocks',
            'createDocument',
            'updateDocument',
            'requestSuggestions',
          ],
          tools: {
            webSearch,
            getWeather,
            getStocks,
            createDocument: createDocument({ userId: dbUser.id, dataStream }),
            updateDocument: updateDocument({ userId: dbUser.id, dataStream }),
            requestSuggestions: requestSuggestions({ userId: dbUser.id, dataStream }),
          },
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          onFinish: async ({ response }) => {
            if (userId) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                      modelId: 'github-copilot',
                    },
                  ],
                });
              } catch (error) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Sync Clerk user with database
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const dbUser = await syncClerkUser(
    clerkUserId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  let chat: Chat;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== dbUser.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Sync Clerk user with database
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const dbUser = await syncClerkUser(
    clerkUserId,
    clerkUser.emailAddresses[0]?.emailAddress || '',
  );

  const chat = await getChatById({ id });

  if (chat.userId !== dbUser.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
