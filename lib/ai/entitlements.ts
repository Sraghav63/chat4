// Entitlements simplified - all authenticated users get the same access
// Using Clerk for authentication, so all users are authenticated
export interface Entitlements {
  maxMessagesPerDay: number;
}

export const defaultEntitlements: Entitlements = {
  maxMessagesPerDay: 100,
};
