import { cookies } from 'next/headers';
import { currentUser } from '@clerk/nextjs/server';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Script from 'next/script';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, cookieStore] = await Promise.all([currentUser(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  const userData = user ? {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress || null,
    name: user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.firstName || user.username || null,
    imageUrl: user.imageUrl,
  } : undefined;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={userData} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
