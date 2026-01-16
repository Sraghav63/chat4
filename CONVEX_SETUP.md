# Convex Setup Instructions

## Option 1: Use Your Existing Deployment (Recommended)

If you want to use your existing deployment at `dapper-hawk-31.convex.cloud`:

1. **Set environment variables** in your `.env.local` file:
   ```
   CONVEX_DEPLOYMENT=dapper-hawk-31
   NEXT_PUBLIC_CONVEX_URL=https://dapper-hawk-31.convex.cloud
   ```

2. **Deploy your functions** to the existing deployment:
   ```powershell
   npx convex deploy --prod
   ```

## Option 2: Use the New Deployment

If you want to use the new deployment that was just created (`majestic-dolphin-846`):

1. The `.env.local` file should already have the correct values from `npx convex dev`
2. **Deploy your functions**:
   ```powershell
   npx convex deploy
   ```

## Fixing the Schema Error

The schema error has been fixed. The issue was trying to index `_id` which is not allowed in Convex. 
I've removed the invalid index and replaced it with a `by_created_at` index.

## Next Steps

1. Make sure your `.env.local` has the correct `NEXT_PUBLIC_CONVEX_URL`
2. Run `npx convex deploy` (or `npx convex deploy --prod` for production)
3. Your functions will be deployed and ready to use!
