# API Usage Examples

This document provides practical examples of how to use the BC Transit GTFS API endpoints.

## Base URL
```
http://localhost:3000/api
```

## 1. Getting Bus Arrivals

Get the next arrivals for a specific stop:

```bash
curl "http://localhost:3000/api/arrivals/12345"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "stopId": "12345",
    "arrivalCount": 2,
    "arrivals": [
      {
        "stopId": "12345",
        "routeId": "1",
        "routeShortName": "1",
        "routeLongName": "University/Downtown",
        "routeColor": "FF0000",
        "routeTextColor": "FFFFFF",
        "tripHeadsign": "University",
        "arrivalTimes": [
          {
            "time": 1642248600,
            "headsign": "University"
          }
        ]
      }
    ]
  }
}
```

## 2. Finding Nearby Stops

Find transit stops within 1km of downtown Victoria:

```bash
curl "http://localhost:3000/api/stops/nearby?lat=48.4284&lon=-123.3656&radius=1000"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "location": {
      "latitude": 48.4284,
      "longitude": -123.3656
    },
    "radius": 1000,
    "stopCount": 15,
    "stops": [
      {
        "stop": {
          "stopId": "12345",
          "stopName": "Government & Belleville",
          "stopLat": 48.4285,
          "stopLon": -123.3655,
          "stopCode": "12345"
        },
        "distance": 15
      }
    ]
  }
}
```

## 3. Getting Real-time Vehicle Positions

Get all active buses:

```bash
curl "http://localhost:3000/api/vehicles"
```

Get vehicles for a specific route:

```bash
curl "http://localhost:3000/api/vehicles/route/1"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "routeId": "1",
    "vehicleCount": 3,
    "vehicles": [
      {
        "vehicleId": "1234",
        "routeId": "1",
        "tripId": "trip_123",
        "latitude": 48.4284,
        "longitude": -123.3656,
        "bearing": 180.5,
        "speed": 25.5,
        "timestamp": 1642248600,
        "occupancyStatus": "FEW_SEATS_AVAILABLE",
        "congestionLevel": "RUNNING_SMOOTHLY"
      }
    ]
  }
}
```

## 4. Checking Service Alerts

Get all current service alerts:

```bash
curl "http://localhost:3000/api/alerts"
```

Get alerts for a specific route:

```bash
curl "http://localhost:3000/api/alerts?routeId=1"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "alertCount": 1,
    "alerts": [
      {
        "alertId": "alert_123",
        "headerText": "Route 1 Delay",
        "descriptionText": "Route 1 is experiencing delays due to traffic",
        "severity": "WARNING",
        "effect": "SIGNIFICANT_DELAYS",
        "activePeriods": [
          {
            "start": 1642248000,
            "end": 1642251600
          }
        ],
        "informedEntities": [
          {
            "routeId": "1"
          }
        ]
      }
    ]
  }
}
```

## 5. Browsing Routes and Stops

Get all available routes (paginated):

```bash
curl "http://localhost:3000/api/routes?page=1&limit=10"
```

Get details for a specific route:

```bash
curl "http://localhost:3000/api/routes/1"
```

Get all stops served by a route:

```bash
curl "http://localhost:3000/api/routes/1/stops"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "route": {
      "routeId": "1",
      "shortName": "1",
      "longName": "University/Downtown",
      "routeColor": "FF0000",
      "routeTextColor": "FFFFFF"
    },
    "stopCount": 25,
    "stops": [
      {
        "stopId": "12345",
        "stopName": "Government & Belleville",
        "stopLat": 48.4285,
        "stopLon": -123.3655,
        "stopCode": "12345"
      }
    ]
  }
}
```

## 6. Getting Stop Information

Get details about a specific stop:

```bash
curl "http://localhost:3000/api/stops/12345"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "stopId": "12345",
    "stopName": "Government & Belleville",
    "stopDesc": "Government St at Belleville St",
    "stopLat": 48.4285,
    "stopLon": -123.3655,
    "stopCode": "12345"
  }
}
```

## 7. Trip Information

Get detailed information about a specific trip:

```bash
curl "http://localhost:3000/api/trips/trip_123"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "trip": {
      "tripId": "trip_123",
      "routeId": "1",
      "tripHeadsign": "University"
    },
    "route": {
      "routeId": "1",
      "shortName": "1",
      "longName": "University/Downtown",
      "routeColor": "FF0000",
      "routeTextColor": "FFFFFF"
    },
    "stopTimes": [
      {
        "tripId": "trip_123",
        "arrivalTime": "08:00:00",
        "departureTime": "08:00:00",
        "stopId": "12345",
        "stopSequence": 1
      }
    ]
  }
}
```

## 8. Health Check

Check if the API is running:

```bash
curl "http://localhost:3000/api/health"
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "status": "healthy",
    "uptime": 3600.5,
    "version": "1.0.0"
  }
}
```

## 9. API Documentation

Get interactive API documentation:

```bash
curl "http://localhost:3000/api"
```

## JavaScript/Frontend Examples

### Using Fetch API

```javascript
// Get nearby stops
async function getNearbyStops(lat, lon, radius = 500) {
  const response = await fetch(
    `http://localhost:3000/api/stops/nearby?lat=${lat}&lon=${lon}&radius=${radius}`
  );
  const data = await response.json();
  return data.data.stops;
}

// Get bus arrivals
async function getBusArrivals(stopId) {
  const response = await fetch(
    `http://localhost:3000/api/arrivals/${stopId}`
  );
  const data = await response.json();
  return data.data.arrivals;
}

// Get real-time vehicle positions
async function getVehiclePositions(routeId) {
  const url = routeId 
    ? `http://localhost:3000/api/vehicles/route/${routeId}`
    : `http://localhost:3000/api/vehicles`;
  
  const response = await fetch(url);
  const data = await response.json();
  return data.data.vehicles;
}

// Usage examples
getNearbyStops(48.4284, -123.3656, 1000)
  .then(stops => console.log('Nearby stops:', stops));

getBusArrivals('12345')
  .then(arrivals => console.log('Next arrivals:', arrivals));

getVehiclePositions('1')
  .then(vehicles => console.log('Route 1 buses:', vehicles));
```

### Error Handling

```javascript
async function safeApiCall(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API call failed');
    }
    
    return data.data;
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}

// Usage with error handling
safeApiCall('http://localhost:3000/api/stops/invalid-id')
  .then(data => console.log(data))
  .catch(error => console.error('Failed to get stop:', error.message));
```

## Python Examples

```python
import requests
import json

BASE_URL = "http://localhost:3000/api"

def get_nearby_stops(lat, lon, radius=500):
    """Get stops near a location"""
    response = requests.get(f"{BASE_URL}/stops/nearby", params={
        'lat': lat,
        'lon': lon,
        'radius': radius
    })
    data = response.json()
    return data['data']['stops'] if data['success'] else []

def get_bus_arrivals(stop_id):
    """Get next arrivals for a stop"""
    response = requests.get(f"{BASE_URL}/arrivals/{stop_id}")
    data = response.json()
    return data['data']['arrivals'] if data['success'] else []

def get_vehicle_positions(route_id=None):
    """Get real-time vehicle positions"""
    url = f"{BASE_URL}/vehicles"
    if route_id:
        url += f"/route/{route_id}"
    
    response = requests.get(url)
    data = response.json()
    return data['data']['vehicles'] if data['success'] else []

# Usage examples
if __name__ == "__main__":
    # Find stops near downtown Victoria
    stops = get_nearby_stops(48.4284, -123.3656, 1000)
    print(f"Found {len(stops)} nearby stops")
    
    # Get arrivals for first stop
    if stops:
        arrivals = get_bus_arrivals(stops[0]['stop']['stopId'])
        print(f"Next {len(arrivals)} arrivals at {stops[0]['stop']['stopName']}")
    
    # Get all active buses
    vehicles = get_vehicle_positions()
    print(f"Currently tracking {len(vehicles)} vehicles")
```

## Common Use Cases

### 1. Transit App
```javascript
// Complete transit app workflow
async function buildTransitApp(userLat, userLon) {
  // 1. Find nearby stops
  const nearbyStops = await getNearbyStops(userLat, userLon, 800);
  
  // 2. Get arrivals for each stop
  const stopsWithArrivals = await Promise.all(
    nearbyStops.slice(0, 5).map(async ({ stop, distance }) => {
      const arrivals = await getBusArrivals(stop.stopId);
      return { stop, distance, arrivals };
    })
  );
  
  // 3. Show live vehicle positions
  const allVehicles = await getVehiclePositions();
  
  return {
    nearbyStops: stopsWithArrivals,
    activeVehicles: allVehicles
  };
}
```

### 2. Route Monitoring
```javascript
// Monitor a specific route
async function monitorRoute(routeId) {
  const [route, vehicles, alerts] = await Promise.all([
    fetch(`${BASE_URL}/routes/${routeId}`).then(r => r.json()),
    getVehiclePositions(routeId),
    fetch(`${BASE_URL}/alerts?routeId=${routeId}`).then(r => r.json())
  ]);
  
  return {
    route: route.data,
    vehicles,
    alerts: alerts.data?.alerts || []
  };
}
```

### 3. Stop Monitoring Dashboard
```javascript
// Real-time stop monitoring
function createStopMonitor(stopId) {
  const updateInterval = 30000; // 30 seconds
  
  async function update() {
    const [arrivals, alerts] = await Promise.all([
      getBusArrivals(stopId),
      fetch(`${BASE_URL}/alerts?stopId=${stopId}`).then(r => r.json())
    ]);
    
    console.log(`Stop ${stopId} - ${arrivals.length} arrivals, ${alerts.data?.alertCount || 0} alerts`);
    return { arrivals, alerts: alerts.data?.alerts || [] };
  }
  
  // Initial update
  update();
  
  // Set up periodic updates
  setInterval(update, updateInterval);
}
```
