
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkState() {
    console.log("--- DEBUG STATE ---");

    // 1. Accounts
    const accounts = await prisma.account.findMany();
    console.log(`Accounts Found: ${accounts.length}`);
    accounts.forEach(a => console.log(` - ${a.email} (${a.provider}): Connected=${a.isConnected}`));

    // 2. Campaigns
    const campaigns = await prisma.campaign.findMany({
        include: { steps: true, leads: true }
    });
    console.log(`\nCampaigns Found: ${campaigns.length}`);
    campaigns.forEach(c => {
        console.log(` - [${c.status}] ${c.name} (ID: ${c.id})`);
        console.log(`   Steps: ${c.steps.length}`);
        console.log(`   Leads: ${c.leads.length} total`);
        const pending = c.leads.filter(l => l.status === 'pending');
        const sent = c.leads.filter(l => l.status === 'sent');
        console.log(`   -- Pending: ${pending.length}`);
        console.log(`   -- Sent: ${sent.length}`);
    });

    console.log("-------------------");
}

checkState()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
