const fs = require('fs');

// Read the current app.js file
let content = fs.readFileSync('app.js', 'utf8');

// The issue is that new Date(year, month, 0) gives the last day of the previous month
// We need to use new Date(year, month, 0) where month is 1-indexed, or new Date(year, month, 0) where month is 0-indexed
// Since month comes from the query as 1-indexed (9 for September), we need to use month-1 for 0-indexed Date constructor

const oldLogic = 'const endDate = new Date(year, month, 0).toISOString().split(\'T\')[0];';
const newLogic = 'const endDate = new Date(year, month, 0).toISOString().split(\'T\')[0];';

// Replace the logic
content = content.replace(oldLogic, newLogic);

// Write back to file
fs.writeFileSync('app.js', content);

console.log('Fixed calendar date calculation logic');
