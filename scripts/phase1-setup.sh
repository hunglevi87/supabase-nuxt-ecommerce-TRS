#!/bin/bash
# Phase 1: Database Setup for Haggle Feature
# This script applies the schema migrations to your Supabase project

set -e

echo "🔧 Phase 1: Haggle Feature Database Setup"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Environment variables not set. Reading from .env..."
    set -a
    source .env
    set +a
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    echo "   Add them to .env or export them as environment variables"
    exit 1
fi

echo "✅ Supabase credentials found"
echo "🔗 Project URL: $SUPABASE_URL"
echo ""

echo "📊 Applying migrations..."
echo "   → 202603180001_haggle_feature_schema.sql"
echo ""

# Apply the migration
psql "$SUPABASE_URL/rest/v1/" \
  -h "$(echo $SUPABASE_URL | sed 's|.*://||' | sed 's|\..*||').supabase.co" \
  -U "postgres" \
  -f "supabase/migrations/202603180001_haggle_feature_schema.sql" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify tables in Supabase dashboard:"
echo "     - offers table should exist"
echo "     - products.allows_haggle should be present"
echo "     - orders.offer_id should be present"
echo ""
echo "  2. Start Phase 2: Backend API endpoints"
echo "     - cd server/api/offers"
echo "     - Create POST endpoint"
echo ""
