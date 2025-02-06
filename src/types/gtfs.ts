export interface BusArrival {
  stopId: string;
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeColor: string;
  routeTextColor: string;
  arrivalTimes: number[]; // Unix timestamps
}

export interface GTFSRoute {
  routeId: string;
  shortName: string;
  longName: string;
  routeColor: string;
  routeTextColor: string;
}
