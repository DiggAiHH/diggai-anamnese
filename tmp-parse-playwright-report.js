const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function walkSuite(s) {
  if (s.specs) {
    for (const spec of s.specs) {
      if (spec.ok === false) {
        console.log('TEST: ' + spec.title);
        console.log('FILE: ' + spec.file + ':' + spec.line + ':' + spec.column);
        for (const test of spec.tests || []) {
          console.log('PROJECT: ' + test.projectName + ' STATUS: ' + test.status);
          for (const result of test.results || []) {
            console.log('RESULT STATUS: ' + result.status);
            if (result.error) {
              console.log('ERROR MESSAGE:');
              console.log(result.error.message || '');
              console.log('ERROR STACK:');
              console.log(result.error.stack || '');
            }
            if (result.errors) {
              result.errors.forEach((err, i) => {
                console.log('ERROR[' + (i + 1) + '] MESSAGE:');
                console.log(err.message || '');
                console.log('ERROR[' + (i + 1) + '] STACK:');
                console.log(err.stack || '');
              });
            }
          }
        }
      }
    }
  }
  if (s.suites) {
    for (const c of s.suites) walkSuite(c);
  }
}
for (const s of data.suites || []) walkSuite(s);
