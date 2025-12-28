#!/bin/bash

# Script to deploy a specific Supabase Edge Function
# Usage: ./scripts/deploy-function.sh <function-name>

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if function name is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Function name is required${NC}"
    echo ""
    echo "Usage: ./scripts/deploy-function.sh <function-name>"
    echo ""
    echo "Example: ./scripts/deploy-function.sh save-credit-token-callback"
    echo ""
    echo "Available functions:"
    ls -1 supabase/functions/ 2>/dev/null | sed 's/^/  - /' || echo "  (No functions found)"
    exit 1
fi

FUNCTION_NAME=$1

# Check if function directory exists
if [ ! -d "supabase/functions/$FUNCTION_NAME" ]; then
    echo -e "${RED}❌ Error: Function '$FUNCTION_NAME' not found${NC}"
    echo ""
    echo "Available functions:"
    ls -1 supabase/functions/ 2>/dev/null | sed 's/^/  - /' || echo "  (No functions found)"
    exit 1
fi

# Check if supabase config exists
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Error: Not in a Supabase project directory${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

echo -e "${BLUE}🚀 Deploying Supabase Edge Function: ${FUNCTION_NAME}${NC}"
echo "============================================="
echo ""

# Deploy the function
echo -e "${BLUE}📦 Deploying ${FUNCTION_NAME}...${NC}"
if supabase functions deploy "$FUNCTION_NAME"; then
    echo ""
    echo -e "${GREEN}✅ Function '${FUNCTION_NAME}' deployed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🔍 To verify deployment, run:${NC}"
    echo "   supabase functions list"
    echo ""
    echo -e "${BLUE}🧪 Test the function at:${NC}"
    echo "   https://<your-project-ref>.supabase.co/functions/v1/${FUNCTION_NAME}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

