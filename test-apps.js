async function testAppsAPI() {
  try {
    // Test the apps API
    const response = await fetch('http://localhost:3000/api/apps');
    const data = await response.json();
    console.log('Apps API Response:', data);
    
    if (response.ok) {
      console.log('✅ Apps API is working!');
      console.log('Number of apps:', data.length);
      if (data.length > 0) {
        console.log('First app:', JSON.stringify(data[0], null, 2));
      }
    } else {
      console.log('❌ Apps API error:');
      console.log('Status:', response.status);
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('Error testing Apps API:', error);
  }
}

testAppsAPI();