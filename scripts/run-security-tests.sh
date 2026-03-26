#!/bin/bash
# Comprehensive Security Test Suite Runner
# Runs all security checks including OWASP tests, dependency audit, and configuration validation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     DiggAI Security Test Suite v3.0.0                    ║"
echo "║     OWASP Top 10 + Compliance Validation                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Working Directory: $APP_DIR"
echo ""

cd "$APP_DIR"

# Phase 1: Environment Check
echo -e "${BLUE}🔍 Phase 1: Environment Variables${NC}"
echo "─────────────────────────────────────────────────────────────"

if [ -f "$SCRIPT_DIR/check-env.sh" ]; then
    if bash "$SCRIPT_DIR/check-env.sh" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Environment check passed${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  Environment check has warnings${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Environment check script not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Phase 2: Dependency Audit
echo -e "${BLUE}🔍 Phase 2: Dependency Vulnerability Audit${NC}"
echo "─────────────────────────────────────────────────────────────"

# Moderate and above
if npm audit --audit-level=moderate 2>/dev/null; then
    echo -e "${GREEN}✅ No moderate+ vulnerabilities found${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  Moderate+ vulnerabilities found (see above)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Critical check (must pass)
if npm audit --audit-level=critical 2>/dev/null; then
    echo -e "${GREEN}✅ No critical vulnerabilities${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Critical vulnerabilities found!${NC}"
    echo "Run 'npm audit fix' to resolve."
    FAILED=$((FAILED + 1))
fi

echo ""

# Phase 3: Type Safety Check
echo -e "${BLUE}🔍 Phase 3: Type Safety${NC}"
echo "─────────────────────────────────────────────────────────────"

if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Type check passed${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Type check failed${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# Phase 4: Security Headers Check (if production URL is accessible)
echo -e "${BLUE}🔍 Phase 4: Security Headers${NC}"
echo "─────────────────────────────────────────────────────────────"

if [ -f "$SCRIPT_DIR/security-config-check.sh" ]; then
    # Try to run against local dev server first
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "Local server detected, checking headers..."
        API_URL="localhost:3001" PROTOCOL="http" bash "$SCRIPT_DIR/security-config-check.sh" 2>/dev/null && PASSED=$((PASSED + 1)) || WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${YELLOW}⚠️  Local server not running, skipping header check${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Security headers check script not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Phase 5: OWASP Security Unit Tests
echo -e "${BLUE}🔍 Phase 5: OWASP Security Unit Tests${NC}"
echo "─────────────────────────────────────────────────────────────"

if npm run test:server -- --run server/security-tests/ 2>/dev/null; then
    echo -e "${GREEN}✅ Security unit tests passed${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Security unit tests failed${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# Phase 6: Existing E2E Security Tests
echo -e "${BLUE}🔍 Phase 6: E2E Security Tests${NC}"
echo "─────────────────────────────────────────────────────────────"

if [ -d "$APP_DIR/e2e" ]; then
    if [ -f "$APP_DIR/e2e/security.spec.ts" ] || [ -f "$APP_DIR/e2e/security-pentest.spec.ts" ]; then
        echo -e "${YELLOW}⚠️  E2E security tests available - run 'npx playwright test e2e/security*.spec.ts'${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${YELLOW}⚠️  No dedicated E2E security tests found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  E2E tests directory not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Phase 7: Secret Scan
echo -e "${BLUE}🔍 Phase 7: Secret Detection${NC}"
echo "─────────────────────────────────────────────────────────────"

# Simple secret pattern check
SECRETS_FOUND=0

# Check for potential hardcoded secrets in source
if grep -rE "(password|secret|api[_-]?key|token)\s*=\s*['\"][^'\"]{8,}['\"]" \
    --include="*.ts" --include="*.js" --include="*.json" \
    --exclude-dir=node_modules --exclude="*.test.ts" \
    "$APP_DIR/src" "$APP_DIR/server" 2>/dev/null | grep -v "example\|placeholder\|YOUR_\|process.env"; then
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
fi

# Check .env files
if find "$APP_DIR" -name ".env*" -type f ! -name ".env.example" 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}⚠️  .env files found - ensure they're in .gitignore${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ $SECRETS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious hardcoded secrets detected${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Potential secrets found in source code!${NC}"
    FAILED=$((FAILED + 1))
fi

echo ""

# Phase 8: Configuration Validation
echo -e "${BLUE}🔍 Phase 8: Security Configuration${NC}"
echo "─────────────────────────────────────────────────────────────"

CONFIG_ISSUES=0

# Check for security-related config files
if [ -f "$APP_DIR/.github/workflows/security-scan.yml" ]; then
    echo -e "${GREEN}✅ GitHub security workflow configured${NC}"
else
    echo -e "${YELLOW}⚠️  GitHub security workflow not found${NC}"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

# Check helmet is used
if grep -q "helmet" "$APP_DIR/server/index.ts" 2>/dev/null; then
    echo -e "${GREEN}✅ Helmet middleware detected${NC}"
else
    echo -e "${YELLOW}⚠️  Helmet middleware not detected${NC}"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

# Check rate limiting
if grep -q "rateLimit" "$APP_DIR/server/index.ts" 2>/dev/null; then
    echo -e "${GREEN}✅ Rate limiting configured${NC}"
else
    echo -e "${YELLOW}⚠️  Rate limiting not detected${NC}"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

# Check CSRF protection
if grep -q "csrf" "$APP_DIR/server/index.ts" 2>/dev/null || grep -rq "csrf" "$APP_DIR/server/middleware/" 2>/dev/null; then
    echo -e "${GREEN}✅ CSRF protection detected${NC}"
else
    echo -e "${YELLOW}⚠️  CSRF protection not detected${NC}"
    CONFIG_ISSUES=$((CONFIG_ISSUES + 1))
fi

if [ $CONFIG_ISSUES -eq 0 ]; then
    PASSED=$((PASSED + 1))
else
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# Summary
echo "═══════════════════════════════════════════════════════════"
echo -e "${BLUE}Security Test Summary${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "  ${RED}❌ Failed: $FAILED${NC}"
echo ""
echo "Completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ALL CRITICAL SECURITY CHECKS PASSED              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    
    if [ $WARNINGS -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Note: $WARNINGS non-critical warnings require attention.${NC}"
    fi
    
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ $FAILED SECURITY CHECK(S) FAILED                  ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please address the failures above before deployment."
    exit 1
fi
