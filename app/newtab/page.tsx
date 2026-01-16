import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import NewTabDashboard from '@/components/newtab-dashboard';

export default async function NewTabPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <NewTabDashboard />;
}