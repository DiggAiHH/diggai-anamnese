const fs = require('fs');
const path = require('path');

function dirSize(p) {
  let total = 0;
  try {
    const entries = fs.readdirSync(p, { withFileTypes: true });
    for (const e of entries) {
      try {
        const full = path.join(p, e.name);
        if (e.isDirectory()) total += dirSize(full);
        else total += fs.statSync(full).size;
      } catch (err) {
        // ignore permission errors
      }
    }
  } catch (err) {
    return 0;
  }
  return total;
}

const target = process.argv[2];
if (!target) {
  console.error('Usage: node get-dir-size.cjs <path>');
  process.exit(1);
}

const bytes = dirSize(target);
console.log(target, (bytes / 1024 / 1024 / 1024).toFixed(3) + ' GB');
