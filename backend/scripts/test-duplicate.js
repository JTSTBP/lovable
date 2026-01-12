
async function testDuplicate() {
    const lead = {
        email: `test-${Date.now()}@example.com`,
        firstName: "Test",
        lastName: "User",
        company: "Test Co"
    };

    console.log("1. Creating lead...");
    const res1 = await fetch('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
    });
    const data1 = await res1.json();
    console.log(`Response 1: ${res1.status}`, data1);

    if (res1.status !== 200) {
        console.error("First creation failed!");
        process.exit(1);
    }

    await new Promise(r => setTimeout(r, 1000));

    console.log("2. Creating DUPLICATE lead...");
    const res2 = await fetch('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
    });
    const data2 = await res2.json();
    console.log(`Response 2: ${res2.status}`, data2);

    if (res2.status === 409 && data2.error === "Lead with this email already exists") {
        console.log("✅ SUCCESS: Duplicate rejected correctly.");
    } else {
        console.error("❌ FAILURE: Duplicate was not rejected as expected.");
        process.exit(1);
    }
}

testDuplicate();
