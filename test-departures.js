const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function testDepartureEndpoints() {
  console.log('Testing Departure Endpoints');
  console.log('============================\n');

  try {
    // Test 1: Get API info to check if server is running
    console.log('1. Checking API status...');
    const apiResponse = await fetch(`${BASE_URL}`);
    if (!apiResponse.ok) {
      throw new Error(`API not accessible: ${apiResponse.status}`);
    }
    console.log('✓ API is accessible\n');

    // Test 2: Get all routes to find a valid route for testing
    console.log('2. Getting available routes...');
    const routesResponse = await fetch(`${BASE_URL}/routes?limit=5`);
    const routesData = await routesResponse.json();

    if (!routesData.success || !routesData.data || routesData.data.length === 0) {
      throw new Error('No routes available for testing');
    }

    const testRoute = routesData.data[0];
    console.log(`✓ Found test route: ${testRoute.shortName} - ${testRoute.longName}`);
    console.log(`   Route ID: ${testRoute.routeId}\n`);

    // Test 3: Get stops for the route to find a valid stop
    console.log('3. Getting stops for the route...');
    const stopsResponse = await fetch(`${BASE_URL}/routes/${testRoute.routeId}/stops`);
    const stopsData = await stopsResponse.json();

    if (!stopsData.success || !stopsData.data.stops || stopsData.data.stops.length === 0) {
      throw new Error('No stops available for the test route');
    }

    const testStop = stopsData.data.stops[0];
    console.log(`✓ Found test stop: ${testStop.stopName}`);
    console.log(`   Stop ID: ${testStop.stopId}\n`);

    // Test 4: Test general departures endpoint
    console.log('4. Testing general departures endpoint...');
    const departuresResponse = await fetch(`${BASE_URL}/departures/${testStop.stopId}`);
    const departuresData = await departuresResponse.json();

    console.log(`   Status: ${departuresResponse.status}`);
    console.log(`   Success: ${departuresData.success}`);

    if (departuresData.success) {
      console.log(`   Departure count: ${departuresData.data.departureCount}`);
      console.log(`   Is live data: ${departuresData.data.isLiveData}`);
      console.log(`   Cache TTL: ${departuresData.data.cacheTtl}`);

      if (departuresData.data.departures && departuresData.data.departures.length > 0) {
        const firstDeparture = departuresData.data.departures[0];
        console.log(`   First departure route: ${firstDeparture.routeShortName}`);
        console.log(`   Departure times count: ${firstDeparture.departureTimes.length}`);

        if (firstDeparture.departureTimes.length > 0) {
          const firstTime = firstDeparture.departureTimes[0];
          console.log(`   Next departure: ${firstTime.minutesUntilDeparture} minutes (${firstTime.status})`);
          console.log(`   Headsign: ${firstTime.headsign}`);
          console.log(`   Is scheduled: ${firstTime.isScheduled}`);
        }
      }
      console.log('✓ General departures endpoint working\n');
    } else {
      console.log(`✗ Error: ${departuresData.error}`);
      if (departuresData.errorDetails) {
        console.log(`   Details: ${departuresData.errorDetails}`);
      }
      console.log('');
    }

    // Test 5: Test departures with route filter
    console.log('5. Testing departures with route filter...');
    const filteredDeparturesResponse = await fetch(`${BASE_URL}/departures/${testStop.stopId}?routeId=${testRoute.routeId}&max=3`);
    const filteredDeparturesData = await filteredDeparturesResponse.json();

    console.log(`   Status: ${filteredDeparturesResponse.status}`);
    console.log(`   Success: ${filteredDeparturesData.success}`);

    if (filteredDeparturesData.success) {
      console.log(`   Departure count: ${filteredDeparturesData.data.departureCount}`);
      console.log(`   Route filter: ${filteredDeparturesData.data.routeFilter || 'none'}`);
      console.log('✓ Filtered departures endpoint working\n');
    } else {
      console.log(`✗ Error: ${filteredDeparturesData.error}\n`);
    }

    // Test 6: Test specific route departures endpoint
    console.log('6. Testing specific route departures endpoint...');
    const routeDeparturesResponse = await fetch(`${BASE_URL}/departures/${testStop.stopId}/route/${testRoute.routeId}`);
    const routeDeparturesData = await routeDeparturesResponse.json();

    console.log(`   Status: ${routeDeparturesResponse.status}`);
    console.log(`   Success: ${routeDeparturesData.success}`);

    if (routeDeparturesData.success) {
      console.log(`   Stop ID: ${routeDeparturesData.data.stopId}`);
      console.log(`   Route ID: ${routeDeparturesData.data.routeId}`);
      console.log(`   Departure count: ${routeDeparturesData.data.departureCount}`);
      console.log('✓ Route-specific departures endpoint working\n');
    } else {
      console.log(`✗ Error: ${routeDeparturesData.error}\n`);
    }

    // Test 7: Test next departure endpoint
    console.log('7. Testing next departure endpoint...');
    const nextDepartureResponse = await fetch(`${BASE_URL}/departures/${testStop.stopId}/route/${testRoute.routeId}/next`);
    const nextDepartureData = await nextDepartureResponse.json();

    console.log(`   Status: ${nextDepartureResponse.status}`);
    console.log(`   Success: ${nextDepartureData.success}`);

    if (nextDepartureData.success) {
      console.log(`   Stop ID: ${nextDepartureData.data.stopId}`);
      console.log(`   Route ID: ${nextDepartureData.data.routeId}`);
      console.log(`   Has next departure: ${!!nextDepartureData.data.nextDeparture}`);

      if (nextDepartureData.data.nextDeparture) {
        const departure = nextDepartureData.data.nextDeparture;
        console.log(`   Route: ${departure.routeShortName} - ${departure.routeLongName}`);
        console.log(`   Headsign: ${departure.tripHeadsign}`);
        if (departure.departureTimes && departure.departureTimes.length > 0) {
          const nextTime = departure.departureTimes[0];
          console.log(`   Next departure: ${nextTime.minutesUntilDeparture} minutes`);
        }
      }
      console.log('✓ Next departure endpoint working\n');
    } else if (nextDepartureResponse.status === 404) {
      console.log('   No upcoming departures found (this is expected if no scheduled departures)');
      console.log('✓ Next departure endpoint working (returned 404 as expected)\n');
    } else {
      console.log(`✗ Error: ${nextDepartureData.error}\n`);
    }

    // Test 8: Test invalid stop ID
    console.log('8. Testing error handling with invalid stop ID...');
    const invalidStopResponse = await fetch(`${BASE_URL}/departures/INVALID_STOP_ID`);
    const invalidStopData = await invalidStopResponse.json();

    console.log(`   Status: ${invalidStopResponse.status}`);
    console.log(`   Success: ${invalidStopData.success}`);

    if (!invalidStopData.success || (invalidStopData.success && invalidStopData.data.departureCount === 0)) {
      console.log('✓ Error handling working correctly\n');
    } else {
      console.log('! Unexpected result - should handle invalid stop ID\n');
    }

    // Test 9: Compare arrivals vs departures
    console.log('9. Comparing arrivals vs departures for the same stop...');
    const arrivalsResponse = await fetch(`${BASE_URL}/arrivals/${testStop.stopId}`);
    const arrivalsData = await arrivalsResponse.json();

    if (arrivalsData.success && departuresData.success) {
      console.log(`   Arrivals count: ${arrivalsData.data.arrivalCount}`);
      console.log(`   Departures count: ${departuresData.data.departureCount}`);
      console.log(`   Arrivals are live data: ${arrivalsData.data.isLiveData}`);
      console.log(`   Departures are live data: ${departuresData.data.isLiveData}`);
      console.log('✓ Successfully compared arrivals and departures\n');
    }

    console.log('============================');
    console.log('All departure endpoint tests completed!');
    console.log('============================');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
testDepartureEndpoints();
