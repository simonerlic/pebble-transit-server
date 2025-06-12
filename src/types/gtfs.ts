export interface BusArrival {
  stopId: string;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeColor: string;
  routeTextColor: string;
  tripHeadsign: string;
  arrivalTimes: Array<{
    time: number; // Unix timestamp
    headsign: string;
    minutesUntilArrival: number;
    delaySeconds: number;
    isRealTime: boolean;
    uncertainty?: number;
    status: string; // "Arriving", "Due", "5 min", "Delayed", etc.
  }>;
}

export interface GTFSRoute {
  routeId: string;
  shortName: string;
  longName: string;
  routeColor: string;
  routeTextColor: string;
}

export interface GTFSTrip {
  tripId: string;
  routeId: string;
  tripHeadsign: string;
}

export interface GTFSStop {
  stopId: string;
  stopName: string;
  stopDesc?: string;
  stopLat: number;
  stopLon: number;
  stopCode?: string;
  locationType?: number;
  parentStation?: string;
  wheelchairBoarding?: number;
}

export interface GTFSStopTime {
  tripId: string;
  arrivalTime: string;
  departureTime: string;
  stopId: string;
  stopSequence: number;
  stopHeadsign?: string;
  pickupType?: number;
  dropOffType?: number;
}

export interface VehiclePosition {
  vehicleId: string;
  routeId: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp: number;
  occupancyStatus?: string;
  congestionLevel?: string;
}

export interface ServiceAlert {
  alertId: string;
  headerText: string;
  descriptionText: string;
  severity?: string;
  effect?: string;
  activePeriods: Array<{
    start?: number;
    end?: number;
  }>;
  informedEntities: Array<{
    routeId?: string;
    stopId?: string;
    agencyId?: string;
  }>;
}

export interface NearbyStop {
  stop: GTFSStop;
  distance: number; // in meters
}

export interface RouteWithStops {
  route: GTFSRoute;
  stops: GTFSStop[];
  direction0?: string;
  direction1?: string;
}

export interface TripDetails {
  trip: GTFSTrip;
  route: GTFSRoute;
  stopTimes: GTFSStopTime[];
  vehiclePosition?: VehiclePosition;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  timestamp: string;
  data?: T;
  error?: string;
  errorDetails?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
