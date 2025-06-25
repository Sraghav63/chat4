import { auth } from '../../(auth)/auth';
import { redirect } from 'next/navigation';
import { ChatHistoryList } from '@/components/chat-history-list';

export default async function ChatsPage() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return <ChatHistoryList />;
} 