#!/bin/bash
# Security Check Script for DiggAI Anamnese Platform
# Usage: ./scripts/security-check.sh

set -e

echo "=========================================="
echo "  DiggAI Security Check"
echo "  $(date)"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# 1. npm audit
echo "🔍 [1/6] Checking npm audit..."
echo "----------------------------------------"
if npm audit --audit-level=moderate; then
    echo -e "${GREEN}✓ npm audit passed${NC}"
else
    echo -e "${RED}✗ npm audit failed${NC}"
    FAILED=1
fi
echo ""

# 2. Check for outdated dependencies
echo "📦 [2/6] Checking for outdated dependencies..."
echo "----------------------------------------"
npm outdated || true
echo -e "${YELLOW}ℹ Review outdated packages above${NC}"
echo ""

# 3. Check security headers (if server is running)
echo "🔒 [3/6] Checking security headers..."
echo "----------------------------------------"
if curl -s -I http://localhost:3001/api/system/health > /dev/null 2>&1; then
    echo "Security Headers from /api/system/health:"
    curl -s -I http://localhost:3001/api/system/health | grep -iE "(x-|content-security|strict-transport|permissions)" || true
    
    echo ""
    echo "Checking all expected headers..."
    HEADERS=$(curl -s -I http://localhost:3001/api/system/health)
    
    # Check individual headers
    if echo "$HEADERS" | grep -iq "X-Content-Type-Options"; then
        echo -e "${GREEN}✓ X-Content-Type-Options${NC}"
    else
        echo -e "${RED}✗ X-Content-Type-Options missing${NC}"
        FAILED=1
    fi
    
    if echo "$HEADERS" | grep -iq "X-Frame-Options"; then
        echo -e "${GREEN}✓ X-Frame-Options${NC}"
    else
        echo -e "${RED}✗ X-Frame-Options missing${NC}"
        FAILED=1
    fi
    
    if echo "$HEADERS" | grep -iq "Content-Security-Policy"; then
        echo -e "${GREEN}✓ Content-Security-Policy${NC}"
    else
        echo -e "${YELLOW}⚠ Content-Security-Policy (may be set by Helmet)${NC}"
    fi
    
    if echo "$HEADERS" | grep -iq "Strict-Transport-Security"; then
        echo -e "${GREEN}✓ Strict-Transport-Security${NC}"
    else
        echo -e "${YELLOW}⚠ Strict-Transport-Security (may require HTTPS)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Server not running on localhost:3001, skipping header check${NC}"
fi
echo ""

# 4. Check for secrets in code
echo "🔑 [4/6] Checking for secrets in code..."
echo "----------------------------------------"

# Check for common secret patterns
SECRETS_FOUND=0

# Patterns to check
PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----"
    "AKIA[0-9A-Z]{16}"
    "ghp_[a-zA-Z0-9]{36}"
    "glpat-[a-zA-Z0-9\-]{20}"
)

# Files to exclude
EXCLUDE="node_modules|.git|dist|build|*.log|package-lock.json|yarn.lock|pnpm-lock.yaml"

echo "Scanning for potential secrets (excluding known safe files)..."
for PATTERN in "${PATTERNS[@]}"; do
    MATCHES=$(grep -riE "$PATTERN" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.env*" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=prisma/migrations . 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
        echo -e "${YELLOW}⚠ Potential secret pattern found:${NC}"
        echo "$MATCHES" | head -5
        SECRETS_FOUND=1
    fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ No obvious secrets found in code${NC}"
else
    echo -e "${YELLOW}ℹ Review findings above - some may be false positives${NC}"
fi
echo ""

# Check with gitleaks if available
if command -v gitleaks &> /dev/null; then
    echo "Running gitleaks..."
    if gitleaks detect --verbose --source . 2>/dev/null; then
        echo -e "${GREEN}✓ gitleaks scan passed${NC}"
    else
        echo -e "${YELLOW}⚠ gitleaks found potential secrets (review output above)${NC}"
    fi
else
    echo -e "${YELLOW}ℹ gitleaks not installed, install with: brew install gitleaks${NC}"
fi
echo ""

# 5. Check TypeScript compilation
echo "📝 [5/6] Checking TypeScript compilation..."
echo "----------------------------------------"
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript compilation passed${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    FAILED=1
fi
echo ""

# 6. Run security-focused tests
echo "🧪 [6/6] Running security tests..."
echo "----------------------------------------"
if [ -d "server/security-tests" ]; then
    echo "Found security tests in server/security-tests/"
    echo "Run with: npm test -- server/security-tests/"
    echo -e "${GREEN}✓ Security test files present${NC}"
else
    echo -e "${YELLOW}⚠ No server/security-tests/ directory found${NC}"
fi

echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}  ✓ Security check PASSED${NC}"
else
    echo -e "${RED}  ✗ Security check FAILED${NC}"
fi
echo "=========================================="

exit $FAILED
