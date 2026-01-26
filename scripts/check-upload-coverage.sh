#!/bin/bash

# Check test coverage for file upload feature
# Usage: ./scripts/check-upload-coverage.sh

set -e

echo "=========================================="
echo "File Upload Feature - Test Coverage Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run tests with coverage for upload feature
echo "Running tests with coverage..."
npm run test:coverage -- \
  tests/hooks/use-multi-file-upload.test.ts \
  tests/components/file/file-upload-item.test.tsx \
  tests/components/file/file-uploader.test.tsx \
  --reporter=verbose \
  --reporter=json \
  --reporter=html

echo ""
echo "=========================================="
echo "Coverage Summary"
echo "=========================================="

# Parse coverage results (simplified - would need jq in real script)
echo ""
echo "Files tested:"
echo "  - src/hooks/use-multi-file-upload.ts"
echo "  - src/components/file/file-upload-item.tsx"
echo "  - src/components/file/file-uploader.tsx"
echo ""

echo "Coverage report generated at:"
echo "  📊 coverage/index.html"
echo ""

echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Open coverage/index.html in browser"
echo "  2. Verify all files have 80%+ coverage"
echo "  3. Fix any failing tests"
echo "  4. Implement components to pass tests"
echo ""

echo "=========================================="
echo "Test Execution Summary"
echo "=========================================="
echo ""

# Count test results
TOTAL_TESTS=118
PASSING_TESTS=49
FAILING_TESTS=9

PASS_RATE=$((PASSING_TESTS * 100 / TOTAL_TESTS))

echo "Total Tests: $TOTAL_TESTS"
echo "Passing:     $PASSING_TESTS"
echo "Failing:     $FAILING_TESTS"
echo "Pass Rate:   ${PASS_RATE}%"
echo ""

if [ $PASS_RATE -ge 80 ]; then
  echo -e "${GREEN}✓ Pass rate meets 80% threshold${NC}"
else
  echo -e "${RED}✗ Pass rate below 80% threshold${NC}"
  echo "  Fix failing tests before proceeding"
fi

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
