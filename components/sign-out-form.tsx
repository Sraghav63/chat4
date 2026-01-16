'use client';

import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export const SignOutForm = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <Button 
      onClick={handleSignOut} 
      variant="destructive" 
      size="lg" 
      className="w-full"
    >
      Sign out
    </Button>
  );
};
