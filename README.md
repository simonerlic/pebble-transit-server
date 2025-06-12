# BC Transit GTFS API Server

A comprehensive Node.js/TypeScript API server that provides real-time BC Transit information using GTFS static and GTFS-realtime feeds.

## Features

- **Bus Arrivals**: Get next arrival times for any stop
- **Nearby Stops**: Find transit stops near a location
- **Vehicle Positions**: Real-time bus locations and status
- **Service Alerts**: Current service disruptions and notifications
- **Routes & Stops**: Complete route and stop information
- **Trip Details**: Detailed trip information with stop sequences

## Quick Start

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Environment Variables

Create a `.env` file (optional):

```env
PORT=3000
GTFS_REALTIME_URL=https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48
GTFS_STATIC_URL=https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=48
```

### Running the Server

```bash
# Development mode
npm run dev
# or
bun run dev

# Production build
npm run build
npm start
```

The server will start at `http://localhost:3000` and automatically load GTFS data.

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 📖 API Documentation
```
GET /api
```
Returns complete API documentation and available endpoints.

#### 🩺 Health Check
```
GET /api/health
```
Returns server health status and uptime.

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

#### Bus Arrivals (Live Updates)
```
GET /api/arrivals/:stopId
GET /api/arrivals/:stopId?routeId={routeId}&max={maxArrivals}
GET /api/arrivals/:stopId/route/:routeId
GET /api/arrivals/:stopId/route/:routeId/next
```
Get live bus arrivals with real-time updates, delays, and status information.

**Parameters:**
- `stopId` (path): The stop ID to get arrivals for
- `routeId` (query/path): Filter by specific route
- `max` (query): Maximum arrivals to return (default: 5)

**Live Features:**
- ⚡ **Real-time predictions** with delays and uncertainties
- 🕐 **Minutes until arrival** with live countdown
- 📡 **Live vs scheduled** data indicators
- ⚠️ **Status updates** ("Arriving", "Due", "5 min", "Delayed")
- 🎯 **Route filtering** for specific lines

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
            "headsign": "University",
            "minutesUntilArrival": 3,
            "delaySeconds": 120,
            "isRealTime": true,
            "uncertainty": 30,
            "status": "3 min"
          }
        ]
      }
    ],
    "isLiveData": true,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Nearby Stops
```
GET /api/stops/nearby?lat={latitude}&lon={longitude}&radius={meters}
```
Find transit stops near a location.

**Query Parameters:**
- `lat` (required): Latitude (-90 to 90)
- `lon` (required): Longitude (-180 to 180)
- `radius` (optional): Search radius in meters (default: 500)

**Example:**
```
GET /api/stops/nearby?lat=48.4284&lon=-123.3656&radius=1000
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
    "stopCount": 5,
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

#### Stop Details
```
GET /api/stops/:stopId
```
Get detailed information about a specific stop.

**Parameters:**
- `stopId` (path): The stop ID

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

#### Vehicle Positions
```
GET /api/vehicles
GET /api/vehicles?routeId={routeId}
GET /api/vehicles/route/:routeId
```
Get real-time vehicle positions, optionally filtered by route.

**Query Parameters:**
- `routeId` (optional): Filter vehicles by route ID

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "vehicleCount": 2,
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

#### Service Alerts
```
GET /api/alerts
GET /api/alerts?routeId={routeId}
GET /api/alerts?stopId={stopId}
```
Get service alerts and disruptions, optionally filtered by route or stop.

**Query Parameters:**
- `routeId` (optional): Filter alerts by route ID
- `stopId` (optional): Filter alerts by stop ID

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

#### Routes
```
GET /api/routes
GET /api/routes?page={page}&limit={limit}
```
Get all available routes with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": [
    {
      "routeId": "1",
      "shortName": "1",
      "longName": "University/Downtown",
      "routeColor": "FF0000",
      "routeTextColor": "FFFFFF"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Route Details
```
GET /api/routes/:routeId
```
Get detailed information about a specific route.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "routeId": "1",
    "shortName": "1",
    "longName": "University/Downtown",
    "routeColor": "FF0000",
    "routeTextColor": "FFFFFF"
  }
}
```

#### Route Stops
```
GET /api/routes/:routeId/stops
```
Get all stops served by a specific route.

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

#### Trip Details
```
GET /api/trips/:tripId
```
Get detailed information about a specific trip.

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

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Error message",
  "errorDetails": "Detailed error information"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Data Sources

This API uses BC Transit's GTFS feeds:
- **Static GTFS**: Route, stop, and schedule information
- **GTFS-Realtime**: Live vehicle positions, trip updates, and service alerts

## Development

### Project Structure
```
src/
├── index.ts          # Main server file
├── services/
│   └── gtfsService.ts # GTFS data management
├── types/
│   └── gtfs.ts       # TypeScript interfaces
└── utils/
    └── api.ts        # API utilities
```

### Adding New Endpoints

1. Add new types to `src/types/gtfs.ts`
2. Implement business logic in `src/services/gtfsService.ts`
3. Add endpoint handlers to `src/index.ts`
4. Update this documentation

### Building

```bash
npm run build
```

Builds TypeScript to `dist/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please open a GitHub issue.
