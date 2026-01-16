# Convex Deployment Instructions

## Issue
Your Convex functions are deployed to `fantastic-raven-59`, but your app is trying to connect to `dapper-hawk-31`.

## Solution Options

### Option 1: Deploy to dapper-hawk-31 (Recommended if you want to use existing deployment)

1. Make sure your `.env.local` has:
   ```
   CONVEX_DEPLOYMENT=dev:dapper-hawk-31
   NEXT_PUBLIC_CONVEX_URL=https://dapper-hawk-31.convex.cloud
   ```

2. Deploy your functions:
   ```powershell
   npx convex deploy
   ```

### Option 2: Use fantastic-raven-59 (Use the new deployment)

1. Update your `.env.local`:
   ```
   CONVEX_DEPLOYMENT=dev:fantastic-raven-59
   NEXT_PUBLIC_CONVEX_URL=https://fantastic-raven-59.convex.cloud
   ```

2. The functions are already deployed to this deployment, so it should work immediately.

## Current Status

- **Functions deployed to**: `fantastic-raven-59` ✅
- **App trying to connect to**: `dapper-hawk-31` ❌
- **Fix**: Either deploy to `dapper-hawk-31` OR update `.env.local` to use `fantastic-raven-59`
