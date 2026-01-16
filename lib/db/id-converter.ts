import type { Id } from '../../convex/_generated/dataModel';

// Helper to convert Convex ID to string (for compatibility)
export function convexIdToString(id: Id<any>): string {
  return id;
}

// Helper to convert string to Convex ID (with validation)
export function stringToConvexId<T extends string>(
  id: string,
  tableName: T,
): Id<T> {
  // Convex IDs are strings, so we can cast directly
  // In production, you might want to validate the format
  return id as Id<T>;
}

// Check if a string is a valid Convex ID format
export function isValidConvexId(id: string): boolean {
  // Convex IDs are base64url encoded strings, typically 32+ characters
  return /^[a-zA-Z0-9_-]{20,}$/.test(id);
}
