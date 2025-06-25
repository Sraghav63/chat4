import Form from 'next/form';
import { signOut } from '@/app/(auth)/auth';

export const SignOutForm = () => {
  return (
    <Form
      action={async () => {
        'use server';
        await signOut({
          redirectTo: '/',
        });
      }}
    >
      <button type="submit" className="w-full">
        Sign out
      </button>
    </Form>
  );
};
