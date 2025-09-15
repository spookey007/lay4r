# Production Deployment Guide

## Environment Variables Required

Create a `.env` file in your production environment with these variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Server Configuration
EXPRESS_PORT=3001
NODE_ENV=production

# Frontend URLs (update these for your production domain)
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# CORS Configuration
FRONTEND_URL=https://your-domain.com

# Email Configuration (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT Secret (if using JWT)
JWT_SECRET=your-super-secret-jwt-key
```

## Common Production Issues & Solutions

### 1. Port Configuration
- **Issue**: API calls failing because of wrong port
- **Solution**: Ensure `EXPRESS_PORT` matches your server port
- **Check**: Update `NEXT_PUBLIC_*` URLs to match your production domain

### 2. CORS Issues
- **Issue**: CORS errors in production
- **Solution**: Set `FRONTEND_URL` to your production domain
- **Check**: Ensure CORS origin matches your frontend URL

### 3. Database Connection
- **Issue**: Database connection failures
- **Solution**: Ensure `DATABASE_URL` is correctly set
- **Check**: Run `npx prisma db push` in production

### 4. PostCSS Build Issues
- **Issue**: "Cannot find module 'autoprefixer'" or PostCSS errors
- **Solution**: Ensure PostCSS dependencies are in `dependencies` not `devDependencies`
- **Check**: `autoprefixer`, `postcss`, `tailwindcss`, and `@tailwindcss/postcss` must be in production dependencies

### 5. ESLint Build Issues
- **Issue**: "ESLint must be installed in order to run during builds"
- **Solution**: Move `eslint` and `eslint-config-next` to `dependencies`
- **Check**: ESLint is required for Next.js production builds

### 6. TypeScript Type Issues
- **Issue**: "Could not find a declaration file for module 'nodemailer'"
- **Solution**: Move `@types/nodemailer` to `dependencies`
- **Check**: Type definitions must be available during production builds

### 7. Build Issues
- **Issue**: Missing dependencies in production
- **Solution**: Ensure all build dependencies are installed
- **Check**: Run `npm ci` instead of `npm install` in production

## Deployment Steps

1. **Set Environment Variables**
   ```bash
   # Copy the .env.example and update values
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Install Dependencies**
   ```bash
   npm ci --production
   ```

3. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Run Database Migrations**
   ```bash
   npx prisma db push
   ```

5. **Build the Application**
   ```bash
   npm run build
   ```

6. **Start the Production Server**
   ```bash
   npm run start
   ```

## Platform-Specific Notes

### Vercel
- Use `vercel.json` for configuration
- Set environment variables in Vercel dashboard
- Use `npm run start:prod` for production

### Docker
- Ensure all environment variables are passed to container
- Use multi-stage build for optimization

### PM2
- Use ecosystem file for process management
- Set environment variables in ecosystem config

## Troubleshooting

### Check Server Status
```bash
curl http://your-domain.com/api/health
```

### Check Logs
```bash
# If using PM2
pm2 logs

# If using Docker
docker logs container-name

# If using systemd
journalctl -u your-service-name
```

### Common Error Messages
- **"Cannot find module"**: Missing dependencies, run `npm ci`
- **"Database connection failed"**: Check `DATABASE_URL`
- **"CORS error"**: Check `FRONTEND_URL` and CORS configuration
- **"Port already in use"**: Check if another process is using the port
