import { cookies } from 'next/headers';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import NewTabDashboard from '@/components/newtab-dashboard';

export default async function NewTabPage() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return <NewTabDashboard session={session} />;
}