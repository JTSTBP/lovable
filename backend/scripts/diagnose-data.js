
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
    console.log("📊 Database Data Diagnosis (Grouped by User ID)");
    console.log("------------------------------------------------");

    try {
        // Group Accounts
        const accounts = await prisma.account.groupBy({
            by: ['userId'],
            _count: { id: true },
        });
        console.log("\n📧 Accounts:");
        accounts.forEach(a => console.log(`   User: [${a.userId || 'NULL'}] -> ${a._count.id} records`));

        // Group Leads
        const leads = await prisma.lead.groupBy({
            by: ['userId'],
            _count: { id: true },
        });
        console.log("\n👥 Leads:");
        leads.forEach(a => console.log(`   User: [${a.userId || 'NULL'}] -> ${a._count.id} records`));

        // Group Campaigns
        const campaigns = await prisma.campaign.groupBy({
            by: ['userId'],
            _count: { id: true },
        });
        console.log("\n📢 Campaigns:");
        campaigns.forEach(a => console.log(`   User: [${a.userId || 'NULL'}] -> ${a._count.id} records`));

        // Group Templates
        const templates = await prisma.emailTemplate.groupBy({
            by: ['userId'],
            _count: { id: true },
        });
        console.log("\n📄 Templates:");
        templates.forEach(a => console.log(`   User: [${a.userId || 'NULL'}] -> ${a._count.id} records`));

    } catch (e) {
        console.error("Error diagnosing:", e);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
