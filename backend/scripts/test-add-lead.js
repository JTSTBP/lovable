
const fetch = require('node-fetch'); // Expecting node-fetch to be available or using built-in fetch if node 18+

async function testAddLead() {
    console.log('🚀 Sending POST request to http://localhost:3000/api/leads...');

    const payload = {
        email: 'test_agent_lead@example.com',
        firstName: 'Agent',
        lastName: 'Smith',
        company: 'Matrix Inc'
    };

    try {
        const response = await fetch('http://localhost:3000/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        console.log(`📡 Response Status: ${status}`);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Server responded with:', data);
        } else {
            const text = await response.text();
            console.log('❌ Failed! Server response:', text);
        }
    } catch (error) {
        console.error('💥 Network/Client Error:', error.message);
    }
}

testAddLead();
