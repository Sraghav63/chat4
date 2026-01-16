import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  if (chat.visibility === 'private') {
    if (userId !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    })) as any;
  }

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        initialVisibilityType={chat.visibility}
        isReadonly={dbUser.id !== chat.userId}
        autoResume={true}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
