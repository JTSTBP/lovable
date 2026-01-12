
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deduplicateLeads() {
    console.log("Checking for duplicate leads...");

    // 1. Get all leads
    const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' } // Newest first
    });

    const seenEmails = new Set();
    const leadsToDelete = [];

    for (const lead of leads) {
        if (seenEmails.has(lead.email)) {
            leadsToDelete.push(lead.id);
        } else {
            seenEmails.add(lead.email);
        }
    }

    if (leadsToDelete.length > 0) {
        console.log(`Found ${leadsToDelete.length} duplicate leads. Deleting...`);
        await prisma.lead.deleteMany({
            where: {
                id: { in: leadsToDelete }
            }
        });
        console.log("Duplicates deleted.");
    } else {
        console.log("No duplicates found.");
    }
}

deduplicateLeads()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
