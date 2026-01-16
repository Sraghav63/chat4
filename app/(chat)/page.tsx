import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

import { Chat } from '@/components/chat';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const id = generateUUID();

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        autoResume={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
