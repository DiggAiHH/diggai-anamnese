#!/bin/bash
# Security Headers Check Script
# Checks that all required security headers are present in HTTP responses
# Usage: ./security-headers-check.sh [URL]

set -e

URL=${1:-"http://localhost:3001"}

echo "=========================================="
echo "Security Headers Check"
echo "Target: $URL"
echo "=========================================="
echo ""

# Fetch headers from the health endpoint
HEADERS=$(curl -s -I "$URL/api/system/health" 2>/dev/null || echo "")

if [ -z "$HEADERS" ]; then
    echo "❌ ERROR: Could not connect to $URL"
    echo "   Make sure the server is running."
    exit 1
fi

check_header() {
    local header_name=$1
    local required=${2:-"true"}
    
    if echo "$HEADERS" | grep -qi "^$header_name:"; then
        local value=$(echo "$HEADERS" | grep -i "^$header_name:" | head -1 | sed 's/\r//')
        echo "✅ $value"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo "❌ $header_name MISSING"
        else
            echo "⚠️  $header_name MISSING (optional)"
        fi
        return 1
    fi
}

ERRORS=0

echo "Checking Security Headers..."
echo "------------------------------"

# Critical Security Headers
check_header "X-Content-Type-Options" || ((ERRORS++))
check_header "X-Frame-Options" || ((ERRORS++))
check_header "Content-Security-Policy" || ((ERRORS++))
check_header "Strict-Transport-Security" || ((ERRORS++))
check_header "X-XSS-Protection" || ((ERRORS++))
check_header "Referrer-Policy" || ((ERRORS++))
check_header "X-DNS-Prefetch-Control" "false" || true

echo ""
echo "------------------------------"

if [ $ERRORS -gt 0 ]; then
    echo "⚠️  RESULT: $ERRORS required security headers missing!"
    echo ""
    echo "Required headers:"
    echo "  - X-Content-Type-Options: nosniff"
    echo "  - X-Frame-Options: DENY or SAMEORIGIN"
    echo "  - Content-Security-Policy: [policy directives]"
    echo "  - Strict-Transport-Security: max-age=..."
    echo "  - X-XSS-Protection: 1; mode=block"
    echo "  - Referrer-Policy: strict-origin-when-cross-origin"
    echo ""
    exit 1
else
    echo "✅ RESULT: All required security headers present!"
    echo ""
    exit 0
fi
