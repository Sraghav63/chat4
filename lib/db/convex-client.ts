import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '../../convex/_generated/dataModel';

// Get the Convex URL from environment variable
// This should match what's in .env.local
// Default to dapper-hawk-31 if not set
const CONVEX_URL = 
  process.env.NEXT_PUBLIC_CONVEX_URL || 
  'https://dapper-hawk-31.convex.cloud';

const client = new ConvexHttpClient(CONVEX_URL);

export { client };
export type { Id };