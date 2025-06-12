## Live Updates Features

### 1. **Real-Time Arrival Predictions**
- **Live GTFS-realtime data** from BC Transit feeds
- **15-30 second updates** from the transit system
- **Accurate predictions** based on current traffic and delays
- **GPS-based tracking** of actual bus positions

### 2. **Enhanced Timing Information**
```json
{
  "time": 1642248600,              // Unix timestamp
  "headsign": "University",        // Bus destination
  "minutesUntilArrival": 3,        // Live countdown
  "delaySeconds": 120,             // Current delay (2 min)
  "isRealTime": true,              // Live vs scheduled data
  "uncertainty": 30,               // Prediction accuracy (±30s)
  "status": "3 min"                // Human-readable status
}
```

### 3. **Multiple Live Update Endpoints**

#### Get All Arrivals at Stop (Live)
```
GET /api/arrivals/12345
GET /api/arrivals/12345?max=10
```

#### Filter by Specific Route (Live)
```
GET /api/arrivals/12345?routeId=1
GET /api/arrivals/12345/route/1
```

#### Next Single Arrival for Route (Live)
```
GET /api/arrivals/12345/route/1/next
```

## 🎯 Live Status Indicators

The API provides intelligent status messages:

| Status | Meaning | Minutes Until |
|--------|---------|---------------|
| `"Arriving"` | Bus is arriving now | ≤ 1 minute |
| `"Due"` | Bus is due | ≤ 2 minutes |
| `"3 min"` | Exact countdown | 3+ minutes |
| `"Delayed"` | Behind schedule | Any time + delay |
| `"Early"` | Ahead of schedule | Any time - early |

## 🔄 How Live Updates Work

### Data Flow
1. **BC Transit vehicles** broadcast GPS positions every 30 seconds
2. **GTFS-realtime feeds** update with new predictions
3. **API fetches** fresh data on each request
4. **Predictions calculated** based on current traffic/delays
5. **Response includes** live timing and status

### Update Frequency
- **GTFS-realtime feeds**: Every 15-30 seconds
- **API calls**: Real-time (no caching)
- **Predictions**: Live calculation on each request

## Live Updates Implementation Examples

### Basic Live Monitoring
```javascript
// Monitor a stop every 15 seconds
setInterval(async () => {
  const response = await fetch('/api/arrivals/12345');
  const data = await response.json();

  data.data.arrivals.forEach(arrival => {
    arrival.arrivalTimes.forEach(time => {
      console.log(`Route ${arrival.routeShortName}: ${time.status}`);
      if (time.minutesUntilArrival <= 2) {
        alert(`Bus arriving in ${time.minutesUntilArrival} minutes!`);
      }
    });
  });
}, 15000);
```

### Route-Specific Live Tracking
```javascript
// Track next Route 1 bus live
async function trackRoute1() {
  const response = await fetch('/api/arrivals/12345/route/1/next');
  const data = await response.json();

  if (data.success) {
    const nextBus = data.data.nextArrival.arrivalTimes[0];
    return {
      status: nextBus.status,
      minutes: nextBus.minutesUntilArrival,
      isLive: nextBus.isRealTime,
      delay: nextBus.delaySeconds
    };
  }
}
```

### Live Updates with Visual Indicators
```javascript
function updateBusDisplay(arrival) {
  const statusIcon = {
    'Arriving': '🔴',
    'Due': '🟡',
    'Delayed': '⚠️',
    'Early': '⚡'
  }[arrival.status] || '🟢';

  const liveIndicator = arrival.isRealTime ? '📡 LIVE' : '📅 Scheduled';

  return `${statusIcon} ${arrival.status} ${liveIndicator}`;
}
```

## Live Updates Demo Scripts

The project includes ready-to-run live update demonstrations:

```bash
# Basic live stop monitoring
npm run demo:basic

# Route-specific live updates
npm run demo:routes

# Monitor nearby stops with live updates
npm run demo:nearby

# Track next single arrival live
npm run demo:next
```

## Advanced Live Features

### 1. **Delay Detection**
```json
{
  "delaySeconds": 300,     // 5 minutes behind schedule
  "status": "Delayed"      // Automatic status update
}
```

### 2. **Prediction Accuracy**
```json
{
  "uncertainty": 45,       // ±45 seconds accuracy
  "isRealTime": true      // GPS-based prediction
}
```

### 3. **Schedule Relationship**
- **SCHEDULED**: Following timetable
- **SKIPPED**: Stop will be skipped
- **NO_DATA**: No prediction available
