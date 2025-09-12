# Production Deployment Guide

This guide covers deploying the Layer4 frontend to Vercel with proper Prisma configuration.

## Production Issues Fixed

The main issues were:

1. **Prisma Client Generation**: Not being generated during Vercel build process
2. **Next.js Configuration**: Conflicts between standalone output and next start
3. **Turbopack/Webpack**: Configuration conflicts in production

These have been fixed with:

1. **Updated build script** to include `prisma generate`
2. **Added postinstall script** for automatic Prisma generation
3. **Updated Next.js config** for proper Prisma handling
4. **Created Vercel configuration** for optimized builds
5. **Fixed standalone output** configuration conflicts
6. **Resolved Turbopack/Webpack** conflicts

## Vercel Deployment Steps

### 1. Environment Variables

Set these in your Vercel dashboard:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# API URLs (update with your backend domain)
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

### 2. Build Configuration

The following files have been updated for production:

- `package.json` - Updated build scripts
- `vercel.json` - Vercel-specific configuration
- `next.config.ts` - Prisma optimization
- `prisma/schema.prisma` - Production binary targets

### 3. Build Process

Vercel will now automatically:
1. Install dependencies (`npm ci`)
2. Generate Prisma Client (`prisma generate`)
3. Build the application (`next build`)

### 4. Database Setup

Make sure your production database is accessible and run:

```bash
npx prisma db push
```

## Troubleshooting

### Prisma Client Issues

If you still get Prisma errors:

1. **Check DATABASE_URL** is correctly set
2. **Verify Prisma generation** in build logs
3. **Clear Vercel cache** and redeploy

### Build Failures

Common fixes:

1. **Environment variables** not set correctly
2. **Database connection** issues
3. **Missing dependencies** in package.json

### Performance Optimization

The configuration includes:

- **Standalone output** for better performance
- **External packages** properly configured
- **Webpack optimization** for Prisma

## Monitoring

After deployment, monitor:

1. **Build logs** for Prisma generation
2. **Runtime logs** for database connections
3. **Performance metrics** in Vercel dashboard

## Support

If you encounter issues:

1. Check the build logs in Vercel
2. Verify all environment variables are set
3. Ensure database is accessible from Vercel
4. Check Prisma Client generation in build process
