async function main() {
  const baseURL = 'http://localhost:5000/api/v1';
  console.log(`Connecting to local API at ${baseURL}...`);

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

    // 2. Try POST /pass/some-uuid/resend-email
    const dummyUuid = '3db32a61-84f5-45f7-bb0e-4e567bb1a828';
    console.log(`\nTesting POST /pass/${dummyUuid}/resend-email...`);
    try {
      const res = await fetch(`${baseURL}/pass/${dummyUuid}/resend-email`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      console.log('Response status:', res.status);
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.log('❌ Request failed:', err.message);
    }

    // 3. Try POST /pass/some-uuid/non-existent-route
    console.log(`\nTesting POST /pass/${dummyUuid}/non-existent-route...`);
    try {
      const res = await fetch(`${baseURL}/pass/${dummyUuid}/non-existent-route`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      console.log('Response status:', res.status);
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.log('❌ Request failed:', err.message);
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
