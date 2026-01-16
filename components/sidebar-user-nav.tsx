'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { LoaderIcon } from './icons';

type User = {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string;
};

export function SidebarUserNav({ user }: { user: User | undefined }) {
  const { isLoaded } = useUser();

  if (!isLoaded) {
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

  // If not logged in, show Sign In link
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/sign-in" className="flex-1">
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
              src={user.imageUrl || `https://avatar.vercel.sh/${user.email}`}
              alt={user.email ?? user.name ?? 'User Avatar'}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span data-testid="user-email" className="truncate">
              {user.name || user.email || 'User'}
            </span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
