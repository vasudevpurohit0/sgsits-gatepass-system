async function main() {
  const baseURL = 'https://sgsits-gatepass-system-production.up.railway.app/api/v1';
  console.log(`Starting production end-to-end SMTP test on ${baseURL}...`);

  try {
    // 1. Login
    console.log('Logging in as admin...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@university.edu',
        password: 'AdminPassword@123'
      })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginData.message}`);
    }

    const token = loginData.data.accessToken;
    console.log('✅ Logged in successfully! Token acquired.');

    const headers = { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    };

    // Generate unique values for phone and ID to avoid DB collisions
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    const phone = `+91${randomSuffix}`;
    const idNumber = `ID-${randomSuffix}`;

    console.log(`\nCreating test pass request (phone: ${phone}, idNumber: ${idNumber})...`);
    
    const validFrom = new Date();
    const validTo = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours validity

    const passRes = await fetch(`${baseURL}/pass`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        visitor: {
          name: 'Vasudev Purohit Test',
          phone,
          email: 'vasudevpurohit001@gmail.com',
          idType: 'AADHAAR',
          idNumber,
          category: 'GENERAL'
        },
        passType: 'VISITOR',
        purpose: 'Verify SMTP Email Delivery End-To-End',
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        allowedGates: ['Main Gate'],
        isMultiEntry: false
      })
    });

    const passData = await passRes.json();
    if (!passRes.ok) {
      throw new Error(`Pass creation failed: ${JSON.stringify(passData)}`);
    }

    const pass = passData.data;
    console.log(`✅ Pass request created successfully! Pass ID: ${pass.id}, Number: ${pass.passNumber}`);

    // 2. Approve the pass
    console.log(`\nApproving pass ${pass.id}...`);
    const approveRes = await fetch(`${baseURL}/pass/${pass.id}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        approved: true,
        remarks: 'Approved programmatically for SMTP verification'
      })
    });

    const approveData = await approveRes.json();
    if (!approveRes.ok) {
      throw new Error(`Pass approval failed: ${JSON.stringify(approveData)}`);
    }

    console.log('Response Status:', approveRes.status);
    console.log('Approval response data:', JSON.stringify(approveData, null, 2));
    
    console.log('\n✅ End-to-end SMTP test trigger complete!');
    console.log('Please check the recipient email: vasudevpurohit001@gmail.com');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

main();
