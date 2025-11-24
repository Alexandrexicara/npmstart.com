const fs = require('fs');
const path = require('path');

// Read the server.js file
const filePath = path.join(__dirname, 'server.js');
const content = fs.readFileSync(filePath, 'utf8');

// Count opening and closing braces
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;

console.log(`Open braces: ${openBraces}`);
console.log(`Close braces: ${closeBraces}`);
console.log(`Difference: ${openBraces - closeBraces}`);

// Try to parse the file
try {
  // This will throw an error if there's a syntax issue
  new Function(content);
  console.log('Syntax OK');
} catch (error) {
  console.log('Syntax Error:', error.message);
  // Find the line number of the error
  const lines = content.split('\n');
  const errorLine = error.stack.match(/:(\d+):\d+/);
  if (errorLine) {
    const lineNum = parseInt(errorLine[1]);
    console.log(`Error at line ${lineNum}:`, lines[lineNum - 1]);
  }
}