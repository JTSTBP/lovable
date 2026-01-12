
import 'dotenv/config';
import { execSync } from 'child_process';

console.log('Explicitly running prisma generate with DATABASE_URL loaded...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is missing from environment!');
    process.exit(1);
}

try {
    execSync('npx prisma generate', {
        stdio: 'inherit',
        env: { ...process.env }
    });
    console.log('Generation successful!');
} catch (error) {
    console.error('Generation failed.');
    process.exit(1);
}
