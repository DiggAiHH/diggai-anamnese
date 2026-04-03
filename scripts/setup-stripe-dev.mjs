#!/usr/bin/env node
// scripts/setup-stripe-dev.mjs

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

class StripeDevSetup {
  constructor() {
    this.stripeCliInstalled = false;
    this.forwardingProcess = null;
  }
  
  async run() {
    console.log('🚀 Stripe Development Setup\n');
    
    try {
      // 1. Check Stripe CLI
      await this.checkStripeCli();
      
      // 2. Check Login
      await this.checkStripeLogin();
      
      // 3. Setup Environment
      await this.setupEnvironment();
      
      // 4. Start Webhook Forwarding
      await this.startWebhookForwarding();
      
      // 5. Menu
      await this.showMenu();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }
  
  async checkStripeCli() {
    console.log('🔍 Checking Stripe CLI...');
    try {
      execSync('stripe --version', { stdio: 'ignore' });
      this.stripeCliInstalled = true;
      console.log('✅ Stripe CLI is installed\n');
    } catch {
      console.log('❌ Stripe CLI not found');
      console.log('📥 Please install: https://stripe.com/docs/stripe-cli');
      console.log('   macOS: brew install stripe/stripe-cli/stripe');
      console.log('   Windows: scoop install stripe');
      console.log('   Linux: snap install stripe\n');
      
      const install = await question('Install now? (y/n): ');
      if (install.toLowerCase() === 'y') {
        this.installStripeCli();
      } else {
        throw new Error('Stripe CLI required');
      }
    }
  }
  
  installStripeCli() {
    const platform = process.platform;
    console.log(`📥 Installing Stripe CLI for ${platform}...`);
    
    try {
      if (platform === 'darwin') {
        execSync('brew install stripe/stripe-cli/stripe', { stdio: 'inherit' });
      } else if (platform === 'linux') {
        execSync('snap install stripe', { stdio: 'inherit' });
      } else {
        console.log('Please install manually from: https://github.com/stripe/stripe-cli/releases');
        process.exit(1);
      }
      console.log('✅ Stripe CLI installed\n');
    } catch (error) {
      throw new Error('Failed to install Stripe CLI');
    }
  }
  
  async checkStripeLogin() {
    console.log('🔐 Checking Stripe login...');
    try {
      execSync('stripe config --list', { stdio: 'ignore' });
      console.log('✅ Already logged in\n');
    } catch {
      console.log('🔑 Please login to Stripe:');
      execSync('stripe login', { stdio: 'inherit' });
    }
  }
  
  async setupEnvironment() {
    console.log('⚙️  Setting up environment...');
    
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch {
      // File doesn't exist
    }
    
    // Check for required vars
    const required = [
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    const missing = required.filter(key => !envContent.includes(key));
    
    if (missing.length > 0) {
      console.log('\n📝 Missing environment variables:');
      for (const key of missing) {
        const value = await question(`${key}: `);
        envContent += `\n${key}=${value}`;
      }
      await fs.writeFile(envPath, envContent);
      console.log('✅ Environment updated\n');
    }
  }
  
  async startWebhookForwarding() {
    console.log('🌐 Starting webhook forwarding...');
    console.log('   Forwarding to: http://localhost:3001/api/webhooks/stripe\n');
    
    this.forwardingProcess = spawn('stripe', [
      'listen',
      '--forward-to', 'http://localhost:3001/api/webhooks/stripe',
      '--print-secret'
    ], {
      stdio: 'pipe'
    });
    
    this.forwardingProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      // Extract webhook secret
      const match = output.match(/whsec_[a-zA-Z0-9]+/);
      if (match) {
        this.updateWebhookSecret(match[0]);
      }
    });
    
    this.forwardingProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  async updateWebhookSecret(secret) {
    const envPath = path.join(process.cwd(), '.env.local');
    let content = await fs.readFile(envPath, 'utf-8');
    
    if (content.includes('STRIPE_WEBHOOK_SECRET=')) {
      content = content.replace(
        /STRIPE_WEBHOOK_SECRET=.*/,
        `STRIPE_WEBHOOK_SECRET=${secret}`
      );
    } else {
      content += `\nSTRIPE_WEBHOOK_SECRET=${secret}`;
    }
    
    await fs.writeFile(envPath, content);
    console.log('✅ Webhook secret saved to .env.local');
  }
  
  async showMenu() {
    console.log('\n📋 Available Commands:');
    console.log('  1. Trigger checkout.session.completed');
    console.log('  2. Trigger invoice.payment_succeeded');
    console.log('  3. Trigger invoice.payment_failed');
    console.log('  4. Trigger customer.subscription.deleted');
    console.log('  5. Open Stripe Dashboard');
    console.log('  6. Exit\n');
    
    while (true) {
      const choice = await question('Select (1-6): ');
      
      switch (choice) {
        case '1':
          this.triggerEvent('checkout.session.completed');
          break;
        case '2':
          this.triggerEvent('invoice.payment_succeeded');
          break;
        case '3':
          this.triggerEvent('invoice.payment_failed');
          break;
        case '4':
          this.triggerEvent('customer.subscription.deleted');
          break;
        case '5':
          execSync('stripe open', { stdio: 'inherit' });
          break;
        case '6':
          this.cleanup();
          return;
      }
    }
  }
  
  triggerEvent(eventType) {
    console.log(`🎬 Triggering ${eventType}...`);
    try {
      execSync(`stripe trigger ${eventType}`, { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to trigger event:', error.message);
    }
  }
  
  cleanup() {
    console.log('\n👋 Stopping webhook forwarding...');
    if (this.forwardingProcess) {
      this.forwardingProcess.kill();
    }
    rl.close();
  }
}

const setup = new StripeDevSetup();
setup.run();
