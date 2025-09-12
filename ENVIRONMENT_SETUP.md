# Environment Configuration Guide

This guide explains how to configure the API URLs and environment variables for both development and production environments.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```bash
# Backend API Configuration
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# CORS Configuration for Backend
CORS_ORIGIN=http://localhost:3000

# Backend Server Port
PORT=4000
```

### Optional Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/layer4"

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key
```

## Production Configuration

For production deployment, update the URLs to point to your production servers:

```bash
# Production URLs
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
CORS_ORIGIN=https://your-frontend-domain.com
```

## Configuration Files

### 1. `src/lib/config.ts`
Centralized configuration file that manages all environment variables and provides helper functions.

### 2. `next.config.ts`
Next.js configuration that ensures environment variables are available at build time.

### 3. `server/index.js`
Backend server configuration that uses environment variables for CORS and port settings.

## API URL Structure

The application uses the following URL structure:

- **Frontend**: `http://localhost:3000` (Next.js)
- **Backend API**: `http://localhost:4000/api` (Express.js)
- **Socket Server**: `http://localhost:4000` (Socket.io)

## Development Setup

1. **Start Backend Server**:
   ```bash
   cd server
   npm start
   # Server runs on http://localhost:4000
   ```

2. **Start Frontend Server**:
   ```bash
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

## Production Deployment

### Frontend (Vercel/Netlify)
Set these environment variables in your deployment platform:
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_API_URL`

### Backend (Railway/Heroku/DigitalOcean)
Set these environment variables:
- `PORT`
- `CORS_ORIGIN`
- `DATABASE_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `JWT_SECRET`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CORS_ORIGIN` matches your frontend URL
2. **Socket Connection Failed**: Check `NEXT_PUBLIC_SOCKET_URL` is correct
3. **API Calls Failing**: Verify `NEXT_PUBLIC_BACKEND_URL` is accessible
4. **Build Errors**: Ensure all `NEXT_PUBLIC_*` variables are set

### Testing Configuration

Test your configuration by:
1. Checking browser network tab for API calls
2. Verifying socket connection in browser console
3. Testing API endpoints directly with curl/Postman

## Security Notes

- Never commit `.env.local` or `.env` files to version control
- Use strong, unique values for `JWT_SECRET`
- Use environment-specific URLs for production
- Consider using a secrets management service for production
