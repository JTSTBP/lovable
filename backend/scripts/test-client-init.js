
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
console.log('Using URL:', url ? url.substring(0, 20) + '...' : 'undefined');

async function test() {
    console.log('\n--- Attempt 3: plain (new PrismaClient()) ---');
    try {
        const prisma3 = new PrismaClient();
        console.log('Init success 3');
        // await prisma3.$connect();
        // console.log('Connect success 3');
    } catch (e) {
        console.log('Init error 3:', e.message);
    }

    console.log('\n--- Attempt 1: datasources object ---');
    try {
        const prisma1 = new PrismaClient({
            datasources: { db: { url } }
        });
        console.log('Init success 1');
    } catch (e) {
        console.log('Init error 1:', e.message);
    }

    console.log('\n--- Attempt 2: datasourceUrl ---');
    try {
        const prisma2 = new PrismaClient({
            datasourceUrl: url
        });
        console.log('Init success 2');
    } catch (e) {
        console.log('Init error 2:', e.message);
    }
}

test();
