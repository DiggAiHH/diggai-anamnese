#!/bin/bash
# Environment Variable Validation Script
# Validates all required and optional environment variables

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
REQUIRED_MISSING=0
OPTIONAL_MISSING=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     DiggAI Environment Variable Check                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Required variables - application won't start without these
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
    "VITE_API_URL"
)

# Optional variables - enhance functionality but not required
OPTIONAL_VARS=(
    "REDIS_URL"
    "LLM_ENDPOINT"
    "OPENAI_API_KEY"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USER"
    "SMTP_PASSWORD"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "VAPID_PUBLIC_KEY"
    "VAPID_PRIVATE_KEY"
    "SENTRY_DSN"
)

# Validation functions
validate_database_url() {
    local url=$1
    if [[ ! "$url" =~ ^postgresql:// ]]; then
        echo -e "${RED}❌ DATABASE_URL must start with postgresql://${NC}"
        return 1
    fi
    if [[ ! "$url" =~ ^postgresql://[^:]+:[^@]+@[^/]+/ ]]; then
        echo -e "${YELLOW}⚠️  DATABASE_URL format may be invalid${NC}"
    fi
    return 0
}

validate_jwt_secret() {
    local secret=$1
    local length=${#secret}
    if [ $length -lt 32 ]; then
        echo -e "${RED}❌ JWT_SECRET must be at least 32 characters (current: $length)${NC}"
        return 1
    fi
    if [[ "$secret" =~ ^(change|default|test|secret|password|123) ]]; then
        echo -e "${YELLOW}⚠️  JWT_SECRET appears to use weak/default value${NC}"
    fi
    return 0
}

validate_encryption_key() {
    local key=$1
    local length=${#key}
    if [ $length -ne 32 ]; then
        echo -e "${RED}❌ ENCRYPTION_KEY must be exactly 32 characters (current: $length)${NC}"
        return 1
    fi
    return 0
}

validate_url() {
    local url=$1
    if [[ ! "$url" =~ ^https?:// ]]; then
        echo -e "${YELLOW}⚠️  URL should use http:// or https://${NC}"
    fi
    return 0
}

# Check required variables
echo -e "${BLUE}Required Variables:${NC}"
echo ""

for var in "${REQUIRED_VARS[@]}"; do
    value="${!var}"
    
    if [ -z "$value" ]; then
        echo -e "  ${RED}❌ $var is NOT SET${NC}"
        REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
    else
        # Mask sensitive values
        if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
            masked="${value:0:4}****${value: -4}"
            echo -e "  ${GREEN}✅ $var is set${NC} (${#value} chars, masked: $masked)"
        else
            echo -e "  ${GREEN}✅ $var is set${NC} ($value)"
        fi
        
        # Run specific validation
        case $var in
            DATABASE_URL)
                validate_database_url "$value" || REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
                ;;
            JWT_SECRET)
                validate_jwt_secret "$value" || REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
                ;;
            ENCRYPTION_KEY)
                validate_encryption_key "$value" || REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
                ;;
            VITE_API_URL)
                validate_url "$value"
                ;;
        esac
    fi
done

echo ""
echo -e "${BLUE}Optional Variables:${NC}"
echo ""

for var in "${OPTIONAL_VARS[@]}"; do
    value="${!var}"
    
    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}⚠️  $var is not set${NC}"
        OPTIONAL_MISSING=$((OPTIONAL_MISSING + 1))
    else
        if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"DSN"* ]]; then
            echo -e "  ${GREEN}✅ $var is set${NC} (${#value} chars, masked)"
        else
            echo -e "  ${GREEN}✅ $var is set${NC}"
        fi
    fi
done

# Feature flags check
echo ""
echo -e "${BLUE}Feature Flags:${NC}"
echo ""

FEATURE_FLAGS=(
    "NFC_ENABLED"
    "PAYMENT_ENABLED"
    "TELEMED_ENABLED"
    "TI_ENABLED"
)

for flag in "${FEATURE_FLAGS[@]}"; do
    value="${!flag}"
    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}⚠️  $flag not set (default: false)${NC}"
    elif [ "$value" = "true" ]; then
        echo -e "  ${GREEN}✅ $flag enabled${NC}"
    else
        echo -e "  ${GREEN}✅ $flag disabled${NC}"
    fi
done

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $REQUIRED_MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
else
    echo -e "${RED}❌ $REQUIRED_MISSING required variable(s) missing or invalid${NC}"
fi

if [ $OPTIONAL_MISSING -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $OPTIONAL_MISSING optional variable(s) not set${NC}"
fi

echo ""

# Security recommendations
echo -e "${BLUE}Security Recommendations:${NC}"
echo ""

# Check for .env file
if [ -f ".env" ]; then
    if [ "$(stat -c %a .env 2>/dev/null || stat -f %Lp .env 2>/dev/null)" != "600" ]; then
        echo -e "  ${YELLOW}⚠️  .env file should have 600 permissions${NC}"
    else
        echo -e "  ${GREEN}✅ .env file has secure permissions${NC}"
    fi
fi

# Check for secrets in environment
if env | grep -qE "(password|secret|key|token)=[^[:space:]]{8,}" 2>/dev/null; then
    echo -e "  ${YELLOW}⚠️  Potential secrets detected in environment output${NC}"
fi

echo ""

if [ $REQUIRED_MISSING -eq 0 ]; then
    exit 0
else
    exit 1
fi
