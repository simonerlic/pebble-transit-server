const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

class LiveTransitUpdates {
  constructor() {
    this.isRunning = false;
    this.updateInterval = 15000; // 15 seconds
    this.monitoredStops = new Map();
  }

  // Monitor a specific stop for live arrival updates
  async monitorStop(stopId, routeId = null, callback = null) {
    const key = routeId ? `${stopId}-${routeId}` : stopId;

    this.monitoredStops.set(key, {
      stopId,
      routeId,
      callback,
      lastUpdate: null,
      errorCount: 0
    });

    console.log(`📍 Started monitoring stop ${stopId}${routeId ? ` for route ${routeId}` : ''}`);

    if (!this.isRunning) {
      this.startLiveUpdates();
    }
  }

  // Start the live update loop
  startLiveUpdates() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Starting live transit updates...');

    this.updateLoop();
  }

  // Stop live updates
  stopLiveUpdates() {
    this.isRunning = false;
    this.monitoredStops.clear();
    console.log('⏹️  Stopped live transit updates');
  }

  // Main update loop
  async updateLoop() {
    while (this.isRunning) {
      try {
        await this.updateAllMonitoredStops();
      } catch (error) {
        console.error('❌ Error in update loop:', error.message);
      }

      // Wait before next update
      await new Promise(resolve => setTimeout(resolve, this.updateInterval));
    }
  }

  // Update all monitored stops
  async updateAllMonitoredStops() {
    const updatePromises = Array.from(this.monitoredStops.entries()).map(
      ([key, monitor]) => this.updateSingleStop(key, monitor)
    );

    await Promise.allSettled(updatePromises);
  }

  // Update a single monitored stop
  async updateSingleStop(key, monitor) {
    try {
      const { stopId, routeId, callback } = monitor;

      // Choose appropriate endpoint
      let url;
      if (routeId) {
        url = `${BASE_URL}/arrivals/${stopId}/route/${routeId}`;
      } else {
        url = `${BASE_URL}/arrivals/${stopId}?max=10`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        monitor.lastUpdate = new Date();
        monitor.errorCount = 0;

        const arrivals = data.data.arrivals || [];
        this.displayLiveUpdate(stopId, routeId, arrivals);

        // Call custom callback if provided
        if (callback) {
          callback(stopId, routeId, arrivals, null);
        }
      } else {
        throw new Error(data.error || 'API request failed');
      }
    } catch (error) {
      monitor.errorCount++;
      console.error(`❌ Failed to update stop ${monitor.stopId}: ${error.message}`);

      if (monitor.callback) {
        monitor.callback(monitor.stopId, monitor.routeId, null, error);
      }

      // Remove monitor if too many consecutive errors
      if (monitor.errorCount >= 5) {
        console.log(`⚠️  Removing monitor for stop ${monitor.stopId} due to repeated errors`);
        this.monitoredStops.delete(key);
      }
    }
  }

  // Display live update in console
  displayLiveUpdate(stopId, routeId, arrivals) {
    const timestamp = new Date().toLocaleTimeString();
    const routeInfo = routeId ? ` (Route ${routeId})` : '';

    console.log(`\n🔄 [${timestamp}] Live Update - Stop ${stopId}${routeInfo}`);
    console.log('=' .repeat(50));

    if (arrivals.length === 0) {
      console.log('ℹ️  No upcoming arrivals');
      return;
    }

    arrivals.forEach((arrival, index) => {
      console.log(`\n🚌 Route ${arrival.routeShortName} - ${arrival.routeLongName}`);
      console.log(`   📍 Destination: ${arrival.tripHeadsign || 'Unknown'}`);

      arrival.arrivalTimes.forEach((arrivalTime, arrIndex) => {
        const statusIcon = this.getStatusIcon(arrivalTime.status);
        const delayInfo = arrivalTime.delaySeconds > 0 ?
          ` (${Math.floor(arrivalTime.delaySeconds / 60)}m delay)` : '';
        const realtimeInfo = arrivalTime.isRealTime ? '📡' : '📅';

        console.log(`   ${statusIcon} ${arrivalTime.status}${delayInfo} ${realtimeInfo}`);
        console.log(`      📍 ${arrivalTime.headsign}`);
        console.log(`      ⏰ Arrives: ${new Date(arrivalTime.time * 1000).toLocaleTimeString()}`);
      });
    });
  }

  // Get status icon based on arrival status
  getStatusIcon(status) {
    if (status.includes('Arriving')) return '🔴';
    if (status.includes('Due')) return '🟡';
    if (status.includes('Delayed')) return '⚠️';
    if (status.includes('Early')) return '⚡';
    return '🟢';
  }

  // Get status summary for all monitored stops
  getStatusSummary() {
    console.log('\n📊 Live Transit Monitor Status');
    console.log('=' .repeat(40));
    console.log(`🔄 Update interval: ${this.updateInterval / 1000}s`);
    console.log(`📍 Monitored locations: ${this.monitoredStops.size}`);
    console.log(`⚡ Status: ${this.isRunning ? 'Active' : 'Stopped'}`);

    if (this.monitoredStops.size > 0) {
      console.log('\n📍 Monitored Stops:');
      this.monitoredStops.forEach((monitor, key) => {
        const routeInfo = monitor.routeId ? ` (Route ${monitor.routeId})` : '';
        const lastUpdate = monitor.lastUpdate ?
          monitor.lastUpdate.toLocaleTimeString() : 'Never';
        const errors = monitor.errorCount > 0 ? ` ⚠️${monitor.errorCount}` : '';

        console.log(`   • Stop ${monitor.stopId}${routeInfo} - Last: ${lastUpdate}${errors}`);
      });
    }
  }
}

// Example usage functions
async function demoBasicLiveUpdates() {
  console.log('🎯 Demo: Basic Live Updates');
  console.log('This will monitor a stop for live arrival updates\n');

  const liveUpdates = new LiveTransitUpdates();

  // Monitor a stop (replace with actual BC Transit stop ID)
  await liveUpdates.monitorStop('12345');

  // Show status every 30 seconds
  const statusInterval = setInterval(() => {
    liveUpdates.getStatusSummary();
  }, 30000);

  // Run for 2 minutes then stop
  setTimeout(() => {
    liveUpdates.stopLiveUpdates();
    clearInterval(statusInterval);
    console.log('\n✅ Demo completed');
  }, 120000);
}

async function demoRouteSpecificUpdates() {
  console.log('🎯 Demo: Route-Specific Live Updates');
  console.log('This will monitor specific routes at a stop\n');

  const liveUpdates = new LiveTransitUpdates();

  // Monitor specific routes at a stop
  await liveUpdates.monitorStop('12345', '1'); // Route 1
  await liveUpdates.monitorStop('12345', '6'); // Route 6

  // Custom callback for route-specific alerts
  const alertCallback = (stopId, routeId, arrivals, error) => {
    if (error) return;

    arrivals.forEach(arrival => {
      arrival.arrivalTimes.forEach(arrivalTime => {
        if (arrivalTime.minutesUntilArrival <= 2) {
          console.log(`🚨 ALERT: Route ${arrival.routeShortName} arriving in ${arrivalTime.minutesUntilArrival} minutes!`);
        }
      });
    });
  };

  // Add another stop with custom callback
  await liveUpdates.monitorStop('67890', '3', alertCallback);

  setTimeout(() => {
    liveUpdates.stopLiveUpdates();
    console.log('\n✅ Route-specific demo completed');
  }, 90000);
}

async function demoNearbyStopsWithLiveUpdates() {
  console.log('🎯 Demo: Nearby Stops with Live Updates');
  console.log('Find nearby stops and monitor them for arrivals\n');

  try {
    // Find nearby stops (Victoria downtown coordinates)
    const nearbyResponse = await fetch(
      `${BASE_URL}/stops/nearby?lat=48.4284&lon=-123.3656&radius=500`
    );
    const nearbyData = await nearbyResponse.json();

    if (!nearbyData.success || nearbyData.data.stops.length === 0) {
      console.log('❌ No nearby stops found');
      return;
    }

    console.log(`📍 Found ${nearbyData.data.stops.length} nearby stops`);

    const liveUpdates = new LiveTransitUpdates();

    // Monitor the closest 3 stops
    const stopsToMonitor = nearbyData.data.stops.slice(0, 3);

    for (const { stop, distance } of stopsToMonitor) {
      console.log(`🏃 Monitoring ${stop.stopName} (${distance}m away)`);
      await liveUpdates.monitorStop(stop.stopId);
    }

    setTimeout(() => {
      liveUpdates.stopLiveUpdates();
      console.log('\n✅ Nearby stops demo completed');
    }, 120000);

  } catch (error) {
    console.error('❌ Error in nearby stops demo:', error.message);
  }
}

async function demoNextArrivalTracking() {
  console.log('🎯 Demo: Next Arrival Tracking');
  console.log('Track the next single arrival for a specific route\n');

  const stopId = '12345';
  const routeId = '1';

  console.log(`🎯 Tracking next arrival for Route ${routeId} at Stop ${stopId}`);

  const trackNextArrival = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/arrivals/${stopId}/route/${routeId}/next`
      );
      const data = await response.json();

      if (data.success) {
        const arrival = data.data.nextArrival;
        const nextTime = arrival.arrivalTimes[0];

        console.log(`\n🚌 Next Route ${arrival.routeShortName}:`);
        console.log(`   📍 To: ${nextTime.headsign}`);
        console.log(`   ⏰ Status: ${nextTime.status}`);
        console.log(`   📡 Real-time: ${nextTime.isRealTime ? 'Yes' : 'No'}`);

        if (nextTime.delaySeconds > 0) {
          console.log(`   ⚠️  Delay: ${Math.floor(nextTime.delaySeconds / 60)} minutes`);
        }
      } else {
        console.log('ℹ️  No upcoming arrivals found');
      }
    } catch (error) {
      console.error('❌ Error tracking next arrival:', error.message);
    }
  };

  // Track every 10 seconds
  const trackingInterval = setInterval(trackNextArrival, 10000);
  trackNextArrival(); // Initial call

  setTimeout(() => {
    clearInterval(trackingInterval);
    console.log('\n✅ Next arrival tracking completed');
  }, 60000);
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'basic':
    demoBasicLiveUpdates();
    break;
  case 'routes':
    demoRouteSpecificUpdates();
    break;
  case 'nearby':
    demoNearbyStopsWithLiveUpdates();
    break;
  case 'next':
    demoNextArrivalTracking();
    break;
  default:
    console.log('🚌 BC Transit Live Updates Demo');
    console.log('================================\n');
    console.log('Available demos:');
    console.log('  node live-updates-example.js basic   - Basic live stop monitoring');
    console.log('  node live-updates-example.js routes  - Route-specific monitoring');
    console.log('  node live-updates-example.js nearby  - Monitor nearby stops');
    console.log('  node live-updates-example.js next    - Track next single arrival');
    console.log('\nMake sure the API server is running: npm run dev');
    break;
}

module.exports = LiveTransitUpdates;
