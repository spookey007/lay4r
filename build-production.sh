#!/bin/bash

# Production build script for Vercel deployment
echo "🚀 Starting production build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations (if needed)
echo "🗄️ Running database migrations..."
npx prisma db push --accept-data-loss

# Build the application
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Production build completed successfully!"
