
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing DB Access...');
    try {
        const count = await prisma.account.count();
        console.log(`Current account count: ${count}`);

        const testEmail = `test-${Date.now()}@example.com`;
        console.log(`Attempting to create account: ${testEmail}`);

        const newAccount = await prisma.account.create({
            data: {
                userId: 'debug-user',
                email: testEmail,
                provider: 'google',
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                isConnected: true
            }
        });
        console.log('Created account:', newAccount);

        // Cleanup
        await prisma.account.delete({ where: { id: newAccount.id } });
        console.log('Cleanup successful');

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
