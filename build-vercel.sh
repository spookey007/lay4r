#!/bin/bash

# Vercel build script for Prisma + Next.js
echo "🚀 Starting Vercel build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Verify Prisma Client was generated
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "❌ Prisma Client generation failed!"
  exit 1
fi

echo "✅ Prisma Client generated successfully!"

# Build the application
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Vercel build completed successfully!"
