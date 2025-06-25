import { auth } from '@/app/(auth)/auth';
import { generateUUID } from '@/lib/utils';
import {
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { VisibilityType } from '@/components/visibility-selector';
import { z } from 'zod';

const postBodySchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch (_) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const originalChat = await getChatById({ id: body.chatId });
  if (!originalChat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (originalChat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const allMessages = await getMessagesByChatId({ id: body.chatId });
  const cutoffIndex = allMessages.findIndex((m) => m.id === body.messageId);
  if (cutoffIndex === -1) {
    return new ChatSDKError('bad_request:api', 'Message not part of chat').toResponse();
  }

  // include the cutoff message
  const messagesToCopy = allMessages.slice(0, cutoffIndex + 1);

  const newChatId = generateUUID();

  await saveChat({
    id: newChatId,
    userId: session.user.id,
    title: `↳ ${originalChat.title}`.slice(0, 255),
    visibility: originalChat.visibility as VisibilityType,
  });

  if (messagesToCopy.length > 0) {
    await saveMessages({
      messages: messagesToCopy.map((msg) => ({
        ...msg,
        id: generateUUID(), // new id
        chatId: newChatId,
      })),
    });
  }

  return Response.json({ id: newChatId }, { status: 201 });
} 