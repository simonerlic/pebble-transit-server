export interface BusArrival {
  stopId: string;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeColor: string;
  routeTextColor: string;
  tripHeadsign: string;
  arrivalTimes: Array<{ time: number; headsign: string }>; // Time is Unix timestamp
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
