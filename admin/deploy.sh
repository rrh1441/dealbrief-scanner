#!/bin/bash

echo "🚀 Deploying DealBrief Admin to Vercel..."

# Build the project first
echo "📦 Building project..."
pnpm run build

# Set environment variables in Vercel
echo "🔧 Setting environment variables..."
vercel env add AUTH_PASSWORD production
vercel env add DATABASE_URL production  
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_API_URL production

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"