import { signOut } from '@/app/(auth)/auth';
import { Button } from '@/components/ui/button';

export const SignOutForm = () => {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
      }}
      className="w-full"
    >
      <Button type="submit" variant="destructive" size="lg" className="w-full">
        Sign out
      </Button>
    </form>
  );
};
