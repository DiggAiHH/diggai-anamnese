/**
 * OWASP ZAP Baseline Security Scan
 * 
 * Dieses Script fuehrt einen automatisierten Sicherheits-Scan durch.
 * Erfordert OWASP ZAP (zaproxy) installiert.
 * 
 * Usage: node scripts/security-scan.js [target-url]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TARGET = process.argv[2] || 'http://localhost:5173';
const REPORT_DIR = path.join(__dirname, '..', 'security-reports');

console.log(`🔒 Starting security scan against: ${TARGET}`);
console.log(`📁 Reports will be saved to: ${REPORT_DIR}`);

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

try {
  // Check if ZAP is installed
  try {
    execSync('which zap-baseline.py || where zap-baseline.py', { stdio: 'ignore' });
  } catch {
    console.error('❌ OWASP ZAP not found. Please install:');
    console.error('   docker pull owasp/zap2docker-stable');
    console.error('   Or install from: https://www.zaproxy.org/download/');
    console.error('');
    console.error('   Alternative: Use Docker:');
    console.error('   docker run -t owasp/zap2docker-stable zap-baseline.py -t <target>');
    process.exit(1);
  }

  // Run baseline scan
  const cmd = `
    zap-baseline.py 
    -t ${TARGET}
    -r ${path.join(REPORT_DIR, 'zap-report.html')}
    -w ${path.join(REPORT_DIR, 'zap-report.md')}
    -J ${path.join(REPORT_DIR, 'zap-report.json')}
    -I
  `.replace(/\n/g, ' ').trim();

  console.log('🚀 Running OWASP ZAP baseline scan...');
  console.log('   This may take several minutes...\n');

  execSync(cmd, { stdio: 'inherit' });

  console.log('\n✅ Security scan completed!');
  console.log(`📊 HTML Report: ${path.join(REPORT_DIR, 'zap-report.html')}`);
  console.log(`📝 Markdown Report: ${path.join(REPORT_DIR, 'zap-report.md')}`);
  console.log(`📈 JSON Report: ${path.join(REPORT_DIR, 'zap-report.json')}`);

} catch (error) {
  console.error('\n⚠️  Security scan found issues!');
  console.log('   Review the report for details.');
  console.log(`   ${path.join(REPORT_DIR, 'zap-report.html')}`);
  process.exit(1);
}
