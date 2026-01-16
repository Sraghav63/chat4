import { auth, currentUser } from '@clerk/nextjs/server';

export async function getAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  return {
    user: {
      id: userId,
      email: user.emailAddresses[0]?.emailAddress || null,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.firstName || user.username || null,
      imageUrl: user.imageUrl,
    },
  };
}

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string;
};
