#!/bin/bash

echo "======================================"
echo "Phase 3: File Management Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        return 1
    fi
}

MISSING=0

echo "Checking API Routes..."
check_file "src/app/api/files/upload-url/route.ts" || MISSING=$((MISSING+1))
check_file "src/app/api/files/confirm/route.ts" || MISSING=$((MISSING+1))
check_file "src/app/api/files/[id]/route.ts" || MISSING=$((MISSING+1))
check_file "src/app/api/files/[id]/download-url/route.ts" || MISSING=$((MISSING+1))
check_file "src/app/api/courses/[id]/files/route.ts" || MISSING=$((MISSING+1))

echo ""
echo "Checking Core Utilities..."
check_file "src/lib/pdf.ts" || MISSING=$((MISSING+1))
check_file "src/lib/api/files.ts" || MISSING=$((MISSING+1))

echo ""
echo "Checking React Hooks..."
check_file "src/hooks/use-files.ts" || MISSING=$((MISSING+1))
check_file "src/hooks/use-multi-file-upload.ts" || MISSING=$((MISSING+1))

echo ""
echo "Checking Test Files..."
check_file "tests/api/files/upload-url.test.ts" || MISSING=$((MISSING+1))
check_file "tests/api/files/confirm.test.ts" || MISSING=$((MISSING+1))
check_file "tests/api/files/route.test.ts" || MISSING=$((MISSING+1))
check_file "tests/api/files/[id]/route.test.ts" || MISSING=$((MISSING+1))
check_file "tests/api/files/[id]/download-url.test.ts" || MISSING=$((MISSING+1))
check_file "tests/lib/pdf.test.ts" || MISSING=$((MISSING+1))
check_file "tests/hooks/use-files.test.tsx" || MISSING=$((MISSING+1))
check_file "tests/hooks/use-multi-file-upload.test.ts" || MISSING=$((MISSING+1))

echo ""
echo "Checking Documentation..."
check_file "docs/PHASE3_IMPLEMENTATION_SUMMARY.md" || MISSING=$((MISSING+1))
check_file "docs/PHASE3_CHECKLIST.md" || MISSING=$((MISSING+1))
check_file "docs/PHASE3_QUICK_START.md" || MISSING=$((MISSING+1))

echo ""
echo "======================================"
if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✓ All files present! Phase 3 is complete.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm install pdf-parse"
    echo "2. Run: npm install --save-dev @types/pdf-parse"
    echo "3. See docs/PHASE3_QUICK_START.md for usage"
else
    echo -e "${RED}✗ $MISSING file(s) missing!${NC}"
    exit 1
fi
echo "======================================"
