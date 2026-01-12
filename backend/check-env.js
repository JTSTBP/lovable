
import fs from 'fs';
const content = fs.readFileSync('.env');
console.log('Length:', content.length);
console.log('First 4 bytes:', content.slice(0, 4));
console.log('String content:', content.toString('utf8').substring(0, 50));
