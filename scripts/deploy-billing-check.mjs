#!/usr/bin/env node
// scripts/deploy-billing-check.mjs

import { execSync } from 'child_process';
import https from 'https';

class DeploymentCheck {
  checks = [];
  
  async run() {
    console.log('🔍 Billing Deployment Pre-Flight Check\n');
    
    // 1. Environment Variables
    this.check('Stripe Secret Key', () => {
      return !!process.env.STRIPE_SECRET_KEY?.startsWith('sk_');
    });
    
    this.check('Stripe Publishable Key', () => {
      return !!process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_');
    });
    
    this.check('Stripe Webhook Secret', () => {
      return !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_');
    });
    
    this.check('Price IDs configured', () => {
      return [
        'STRIPE_PRICE_STARTER',
        'STRIPE_PRICE_PROFESSIONAL', 
        'STRIPE_PRICE_ENTERPRISE'
      ].every(key => !!process.env[key]?.startsWith('price_'));
    });
    
    // 2. Stripe API Verbindung
    await this.checkAsync('Stripe API Connection', async () => {
      try {
        const { stripe } = await import('../server/config/stripe.js');
        await stripe.customers.list({ limit: 1 });
        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    });
    
    // 3. Datenbank
    await this.checkAsync('Database Connection', async () => {
      try {
        const { getPrismaClientForDomain } = await import('../server/db.js');
        const prisma = getPrismaClientForDomain('company');
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    });
    
    // 4. Redis (optional)
    await this.checkAsync('Redis Connection (optional)', async () => {
      try {
        const { getRedisClient } = await import('../server/redis.js');
        const redis = getRedisClient();
        if (!redis) return 'skipped';
        await redis.ping();
        return true;
      } catch {
        return 'skipped';
      }
    });
    
    // 5. SMTP (optional)
    this.check('SMTP Configured (optional)', () => {
      const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
      return hasSmtp || 'skipped';
    });
    
    // Summary
    this.printSummary();
    
    const failed = this.checks.filter(c => c.status === 'FAILED');
    if (failed.length > 0) {
      console.log('\n❌ Deployment blocked. Fix issues above.');
      process.exit(1);
    } else {
      console.log('\n✅ All checks passed. Ready for deployment!');
      process.exit(0);
    }
  }
  
  check(name, testFn) {
    try {
      const result = testFn();
      this.checks.push({
        name,
        status: result === true || result === 'skipped' ? 'PASSED' : 'FAILED',
        result
      });
      this.printCheck(name, result);
    } catch (error) {
      this.checks.push({ name, status: 'FAILED', error: error.message });
      this.printCheck(name, false, error.message);
    }
  }
  
  async checkAsync(name, testFn) {
    try {
      const result = await testFn();
      this.checks.push({
        name,
        status: result === true || result === 'skipped' ? 'PASSED' : 'FAILED',
        result
      });
      this.printCheck(name, result);
    } catch (error) {
      this.checks.push({ name, status: 'FAILED', error: error.message });
      this.printCheck(name, false, error.message);
    }
  }
  
  printCheck(name, result, error) {
    const icon = result === true ? '✅' : result === 'skipped' ? '⚪' : '❌';
    console.log(`${icon} ${name}`);
    if (error) console.log(`   Error: ${error}`);
  }
  
  printSummary() {
    const passed = this.checks.filter(c => c.status === 'PASSED').length;
    const failed = this.checks.filter(c => c.status === 'FAILED').length;
    const skipped = this.checks.filter(c => c.result === 'skipped').length;
    
    console.log('\n📊 Summary:');
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${skipped}`);
  }
}

const check = new DeploymentCheck();
check.run();
