# Convex Deployment Configuration

## Current Setup

### Dev Deployment
- **URL**: `https://dapper-hawk-31.convex.cloud`
- **Deployment Name**: `dapper-hawk-31`
- **Configured in**: `.env.local` as `CONVEX_DEPLOYMENT=dev:dapper-hawk-31`

### Prod Deployment
- **URL**: `https://vibrant-eel-912.convex.cloud`
- **Deployment Name**: `vibrant-eel-912`
- **Configured in**: Production environment variables

## Deploying

### Deploy to Dev
```powershell
npx convex deploy
```
This will deploy to `dapper-hawk-31` (dev deployment).

### Deploy to Prod
```powershell
npx convex deploy --prod
```
This will deploy to `vibrant-eel-912` (prod deployment).

## Environment Variables

### Development (.env.local)
```
CONVEX_DEPLOYMENT=dev:dapper-hawk-31
NEXT_PUBLIC_CONVEX_URL=https://dapper-hawk-31.convex.cloud
```

### Production
Set these environment variables in your hosting platform:
```
NEXT_PUBLIC_CONVEX_URL=https://vibrant-eel-912.convex.cloud
```

## Notes

- The Convex client automatically uses the prod URL when `NODE_ENV=production`
- Make sure to deploy your functions to both dev and prod deployments
- The prod deployment should be used for your live application
