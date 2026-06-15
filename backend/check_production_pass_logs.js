async function main() {
  const baseURL = 'https://sgsits-gatepass-system-production.up.railway.app/api/v1';
  console.log(`Connecting to production API at ${baseURL}...`);

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
    console.log('✅ Logged in successfully!');

    const headers = { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    };

    // 2. Fetch pass details
    const passId = '88a68f35-3ea5-4b03-b576-fdf4f848975b';
    console.log(`\nFetching details for pass ${passId} from production...`);
    const passRes = await fetch(`${baseURL}/pass/${passId}`, {
      method: 'GET',
      headers
    });
    
    const passData = await passRes.json();
    if (!passRes.ok) {
      throw new Error(`Failed to fetch pass: ${JSON.stringify(passData)}`);
    }

    const pass = passData.data;
    console.log('\n--- Pass Properties ---');
    console.log('ID:', pass.id);
    console.log('Number:', pass.passNumber);
    console.log('Status:', pass.status);
    console.log('Visitor Email:', pass.visitor?.email);
    console.log('Approved At:', pass.approvedAt);
    
    // Check if emailDeliveryLogs property exists
    if ('emailDeliveryLogs' in pass) {
      console.log('✅ emailDeliveryLogs field exists!');
      console.log('Content:', JSON.stringify(pass.emailDeliveryLogs, null, 2));
    } else {
      console.log('❌ emailDeliveryLogs field does NOT exist in the response.');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
