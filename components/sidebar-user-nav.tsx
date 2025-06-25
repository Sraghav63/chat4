'use client';

import Image from 'next/image';
import type { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { LoaderIcon } from './icons';
import { guestRegex } from '@/lib/constants';

export function SidebarUserNav({ user }: { user: User }) {
  const { data, status } = useSession();

  const isGuest = guestRegex.test(data?.user?.email ?? '');

  if (status === 'loading') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton className="h-10 justify-between">
            <div className="flex flex-row gap-2">
              <div className="size-6 bg-zinc-500/30 rounded-full animate-pulse" />
              <span className="bg-zinc-500/30 text-transparent rounded-md animate-pulse">
                Loading auth status
              </span>
            </div>
            <div className="animate-spin text-zinc-500">
              <LoaderIcon />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // If guest, show Sign In link
  if (isGuest) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/login" className="flex-1">
            <SidebarMenuButton
              data-testid="sign-in-nav-button"
              className="bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 w-full"
            >
              <LogIn className="size-6" />
              <span className="truncate">Sign in</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Regular logged-in user
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/settings" className="flex-1">
          <SidebarMenuButton
            data-testid="user-nav-button"
            className="bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-10 w-full"
          >
            <Image
              src={`https://avatar.vercel.sh/${user.email}`}
              alt={user.email ?? 'User Avatar'}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span data-testid="user-email" className="truncate">
              {user?.email}
            </span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
