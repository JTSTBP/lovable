
// Using built-in fetch (Node 18+)

async function testLeadsFlow() {
    const baseUrl = 'http://localhost:3000/api';
    const testEmail = `flow_test_${Date.now()}@example.com`;

    console.log('🚀 Starting Leads Flow Test...');

    // 1. Add a Lead
    console.log(`\n1. Adding Lead: ${testEmail}...`);
    try {
        const postRes = await fetch(`${baseUrl}/leads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                firstName: 'Flow',
                lastName: 'Tester',
                company: 'Automated Inc'
            })
        });

        if (!postRes.ok) throw new Error(`POST failed: ${postRes.status} ${postRes.statusText}`);
        const createdLead = await postRes.json();
        console.log('✅ Lead Created:', createdLead);

        // 2. Fetch Leads
        console.log('\n2. Fetching All Leads...');
        const getRes = await fetch(`${baseUrl}/leads`);
        if (!getRes.ok) throw new Error(`GET failed: ${getRes.status} ${getRes.statusText}`);

        const leads = await getRes.json();
        console.log(`📡 Retrieved ${leads.length} leads.`);

        // 3. Verify
        const found = leads.find(l => l.email === testEmail);
        if (found) {
            console.log('✅ VERIFICATION SUCCESS: Created lead was found in the list!');
        } else {
            console.error('❌ VERIFICATION FAILED: Created lead was NOT found in the list.');
        }

    } catch (error) {
        console.error('💥 Test Failed:', error.message);
    }
}

testLeadsFlow();
