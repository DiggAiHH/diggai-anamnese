#!/bin/bash
# Security Configuration Check Script
# Validates security headers and configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-api.diggai.de}"
PROTOCOL="${PROTOCOL:-https}"
TIMEOUT=10

# Counters
PASSED=0
FAILED=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     DiggAI Security Configuration Check v3.0.0           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Target: ${PROTOCOL}://${API_URL}/api/health"
echo "Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Function to check header
check_header() {
    local header=$1
    local expected=$2
    local required=${3:-true}
    
    local value=$(curl -s -I --max-time $TIMEOUT "${PROTOCOL}://${API_URL}/api/health" 2>/dev/null | grep -i "^$header:" | head -1 || echo "")
    
    if [ -z "$value" ]; then
        if [ "$required" = true ]; then
            echo -e "${RED}❌ $header MISSING${NC}"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠️  $header not present (optional)${NC}"
        fi
        return
    fi
    
    if [ -n "$expected" ] && ! echo "$value" | grep -qi "$expected"; then
        echo -e "${YELLOW}⚠️  $header present but unexpected value:${NC}"
        echo "   $value"
        FAILED=$((FAILED + 1))
    else
        echo -e "${GREEN}✅ $header present${NC}"
        if [ -n "$value" ]; then
            echo "   $value"
        fi
        PASSED=$((PASSED + 1))
    fi
}

# Function to check TLS configuration
check_tls() {
    echo ""
    echo "=== TLS Configuration ==="
    
    # Check TLS version
    local tls_version=$(echo | openssl s_client -connect "${API_URL}:443" -servername "${API_URL}" 2>/dev/null | grep "Protocol" | head -1 || echo "")
    
    if echo "$tls_version" | grep -q "TLSv1.3"; then
        echo -e "${GREEN}✅ TLS 1.3 enabled${NC}"
        PASSED=$((PASSED + 1))
    elif echo "$tls_version" | grep -q "TLSv1.2"; then
        echo -e "${YELLOW}⚠️  TLS 1.2 only (TLS 1.3 recommended)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ Weak TLS version${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    # Check certificate expiration
    local cert_expiry=$(echo | openssl s_client -connect "${API_URL}:443" -servername "${API_URL}" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
    
    if [ -n "$cert_expiry" ]; then
        local expiry_epoch=$(date -d "$cert_expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$cert_expiry" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ $days_until_expiry -lt 7 ]; then
            echo -e "${RED}❌ Certificate expires in $days_until_expiry days!${NC}"
            FAILED=$((FAILED + 1))
        elif [ $days_until_expiry -lt 30 ]; then
            echo -e "${YELLOW}⚠️  Certificate expires in $days_until_expiry days${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${GREEN}✅ Certificate valid for $days_until_expiry days${NC}"
            PASSED=$((PASSED + 1))
        fi
    fi
}

# Main checks
echo "=== Security Headers ==="
check_header "Strict-Transport-Security" "max-age=31536000"
check_header "X-Content-Type-Options" "nosniff"
check_header "X-Frame-Options" "DENY"
check_header "Content-Security-Policy" "default-src"
check_header "X-XSS-Protection" "1"
check_header "Referrer-Policy" "strict-origin"
check_header "Permissions-Policy" "camera"
check_header "Cross-Origin-Embedder-Policy" "require-corp" false
check_header "Cross-Origin-Opener-Policy" "same-origin" false
check_header "Cross-Origin-Resource-Policy" "same-origin" false

# TLS checks (only in production-like environments)
if [ "$PROTOCOL" = "https" ] && command -v openssl &> /dev/null; then
    check_tls
fi

# Response check
echo ""
echo "=== API Response ==="
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${PROTOCOL}://${API_URL}/api/health" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Health endpoint responds (HTTP $HTTP_STATUS)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Health endpoint error (HTTP $HTTP_STATUS)${NC}"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Results:"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED security check(s) failed${NC}"
    exit 1
fi
