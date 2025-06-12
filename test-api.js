const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoint(name, url, expectedFields = []) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${name} - Success`);
      if (expectedFields.length > 0) {
        const hasAllFields = expectedFields.every(field => {
          const hasField = data.data && data.data[field] !== undefined;
          if (!hasField) console.log(`  ⚠️  Missing field: ${field}`);
          return hasField;
        });
        if (hasAllFields) {
          console.log(`  ✅ All expected fields present`);
        }
      }
      console.log(`  📊 Response: ${JSON.stringify(data.data).substring(0, 100)}...`);
    } else {
      console.log(`❌ ${name} - Failed: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting BC Transit API Tests');
  console.log('=====================================');

  // Wait for server to be ready
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Test health endpoint
  await testEndpoint(
    'Health Check',
    `${BASE_URL}/health`,
    ['status', 'uptime', 'version']
  );

  // Test API documentation
  await testEndpoint(
    'API Documentation',
    `${BASE_URL}`,
    ['title', 'version', 'endpoints']
  );

  // Test nearby stops (Victoria downtown coordinates)
  await testEndpoint(
    'Nearby Stops',
    `${BASE_URL}/stops/nearby?lat=48.4284&lon=-123.3656&radius=1000`,
    ['location', 'radius', 'stopCount', 'stops']
  );

  // Test routes list
  await testEndpoint(
    'Routes List',
    `${BASE_URL}/routes?page=1&limit=5`,
    []
  );

  // Test vehicle positions
  await testEndpoint(
    'Vehicle Positions',
    `${BASE_URL}/vehicles`,
    ['vehicleCount', 'vehicles']
  );

  // Test service alerts
  await testEndpoint(
    'Service Alerts',
    `${BASE_URL}/alerts`,
    ['alertCount', 'alerts']
  );

  // Test with a common BC Transit stop ID (if it exists)
  await testEndpoint(
    'Bus Arrivals (Test Stop)',
    `${BASE_URL}/arrivals/12345`,
    ['stopId', 'arrivalCount', 'arrivals']
  );

  // Test stop details
  await testEndpoint(
    'Stop Details (Test Stop)',
    `${BASE_URL}/stops/12345`
  );

  console.log('\n🏁 Tests completed!');
  console.log('=====================================');
  console.log('💡 Tips:');
  console.log('  • Check the server logs for GTFS data loading status');
  console.log('  • Some endpoints may return empty data if no real-time info is available');
  console.log('  • Try different stop IDs from the BC Transit system');
  console.log('  • Use nearby stops to find valid stop IDs in your area');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };
