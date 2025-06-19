import fetch from "node-fetch";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {
  BusArrival,
  BusDeparture,
  GTFSRoute,
  GTFSTrip,
  GTFSStop,
  GTFSStopTime,
  VehiclePosition,
  ServiceAlert,
  NearbyStop,
  RouteWithStops,
  TripDetails,
} from "../types/gtfs";
import JSZip from "jszip";

export interface GTFSServiceConfig {
  vehiclePositionsUrl?: string;
  alertsUrl?: string;
  cacheTtl?: number;
  staticRefreshInterval?: number;
}

export class GTFSService {
  private readonly tripUpdatesUrl: string;
  private readonly vehiclePositionsUrl: string;
  private readonly alertsUrl: string;
  private readonly staticGtfsUrl: string;
  private readonly config: GTFSServiceConfig;
  private routes: Map<string, GTFSRoute>;
  private trips: Map<string, GTFSTrip>;
  private stops: Map<string, GTFSStop>;
  private stopTimes: Map<string, GTFSStopTime[]>; // tripId -> stopTimes
  private routeStops: Map<string, string[]>; // routeId -> stopIds

  constructor(
    feedUrl: string,
    staticGtfsUrl: string,
    config: GTFSServiceConfig = {},
  ) {
    // Parse base URL for different feed types
    const baseUrl = feedUrl.replace("/tripupdates.pb", "");
    this.tripUpdatesUrl = feedUrl;
    this.vehiclePositionsUrl =
      config.vehiclePositionsUrl ||
      `${baseUrl}/vehiclepositions.pb?operatorIds=48`;
    this.alertsUrl = config.alertsUrl || `${baseUrl}/alerts.pb?operatorIds=48`;
    this.staticGtfsUrl = staticGtfsUrl;
    this.config = config;
    this.routes = new Map();
    this.trips = new Map();
    this.stops = new Map();
    this.stopTimes = new Map();
    this.routeStops = new Map();
  }

  async initialize(): Promise<void> {
    // Load static GTFS route and trip data
    await this.loadStaticData();
  }

  private async loadStaticData(): Promise<void> {
    console.log(`Loading GTFS zip from: ${this.staticGtfsUrl}`);

    try {
      const response = await fetch(this.staticGtfsUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch GTFS zip: ${response.status} ${response.statusText}`,
        );
      }

      const buffer = await response.buffer();
      console.log(`Received zip data of size: ${buffer.length} bytes`);

      const zip = new JSZip();
      const zipData = await zip.loadAsync(buffer);

      // Load all GTFS files
      await this.loadRoutes(zipData);
      await this.loadTrips(zipData);
      await this.loadStops(zipData);
      await this.loadStopTimes(zipData);
      await this.buildRouteStopsMapping();
    } catch (error) {
      console.error("Error loading GTFS data:", error);
      throw error;
    }
  }

  private async loadRoutes(zipData: JSZip): Promise<void> {
    const routesFile = zipData.file("routes.txt");
    if (!routesFile) {
      throw new Error("routes.txt not found in GTFS zip");
    }

    const routesData = await routesFile.async("string");
    console.log("Processing routes.txt...");

    const lines = routesData.split("\n");
    const header = lines[0].trim();
    console.log("Routes header:", header);

    lines.slice(1).forEach((line, index) => {
      if (line.trim()) {
        const fields = line.split(",");
        if (fields.length >= 6) {
          const routeId = fields[0].trim();
          const shortName = fields[1].trim();
          const longName = fields[2].trim();
          const routeColor = fields[4].trim();
          const routeTextColor = fields[5].trim();

          this.routes.set(routeId, {
            routeId,
            shortName,
            longName,
            routeColor: routeColor || "000000",
            routeTextColor: routeTextColor || "FFFFFF",
          });
        }
      }
    });

    console.log(`Loaded ${this.routes.size} routes`);
  }

  private async loadTrips(zipData: JSZip): Promise<void> {
    const tripsFile = zipData.file("trips.txt");
    if (!tripsFile) {
      throw new Error("trips.txt not found in GTFS zip");
    }

    const tripsData = await tripsFile.async("string");
    console.log("Processing trips.txt...");

    const lines = tripsData.split("\n");
    const header = lines[0].trim();
    console.log("Trips header:", header);

    lines.slice(1).forEach((line, index) => {
      if (line.trim()) {
        const fields = line.split(",");
        if (fields.length >= 4) {
          // Adjust based on your trips.txt format
          const routeId = fields[0].trim();
          const tripId = fields[2].trim();
          const tripHeadsign = fields[3].trim();

          this.trips.set(tripId, {
            tripId,
            routeId,
            tripHeadsign,
          });
        }
      }
    });

    console.log(`Loaded ${this.trips.size} trips`);
  }

  private async loadStops(zipData: JSZip): Promise<void> {
    const stopsFile = zipData.file("stops.txt");
    if (!stopsFile) {
      throw new Error("stops.txt not found in GTFS zip");
    }

    const stopsData = await stopsFile.async("string");
    console.log("Processing stops.txt...");

    const lines = stopsData.split("\n");
    const header = lines[0].trim().split(",");
    console.log("Stops header:", header);

    // Find column indices
    const stopIdIndex = header.indexOf("stop_id");
    const stopNameIndex = header.indexOf("stop_name");
    const stopDescIndex = header.indexOf("stop_desc");
    const stopLatIndex = header.indexOf("stop_lat");
    const stopLonIndex = header.indexOf("stop_lon");
    const stopCodeIndex = header.indexOf("stop_code");

    lines.slice(1).forEach((line) => {
      if (line.trim()) {
        const fields = line.split(",");
        if (
          fields.length >=
          Math.max(stopIdIndex, stopNameIndex, stopLatIndex, stopLonIndex) + 1
        ) {
          const stopId = fields[stopIdIndex]?.trim();
          const stopName = fields[stopNameIndex]?.trim().replace(/"/g, "");
          const stopLat = parseFloat(fields[stopLatIndex]?.trim());
          const stopLon = parseFloat(fields[stopLonIndex]?.trim());

          if (stopId && !isNaN(stopLat) && !isNaN(stopLon)) {
            this.stops.set(stopId, {
              stopId,
              stopName: stopName || stopId,
              stopDesc:
                stopDescIndex >= 0
                  ? fields[stopDescIndex]?.trim().replace(/"/g, "")
                  : undefined,
              stopLat,
              stopLon,
              stopCode:
                stopCodeIndex >= 0 ? fields[stopCodeIndex]?.trim() : undefined,
            });
          }
        }
      }
    });

    console.log(`Loaded ${this.stops.size} stops`);
  }

  private async loadStopTimes(zipData: JSZip): Promise<void> {
    const stopTimesFile = zipData.file("stop_times.txt");
    if (!stopTimesFile) {
      console.warn("stop_times.txt not found in GTFS zip, skipping...");
      return;
    }

    const stopTimesData = await stopTimesFile.async("string");
    console.log("Processing stop_times.txt...");

    const lines = stopTimesData.split("\n");
    const header = lines[0].trim().split(",");

    // Find column indices
    const tripIdIndex = header.indexOf("trip_id");
    const arrivalTimeIndex = header.indexOf("arrival_time");
    const departureTimeIndex = header.indexOf("departure_time");
    const stopIdIndex = header.indexOf("stop_id");
    const stopSequenceIndex = header.indexOf("stop_sequence");

    lines.slice(1).forEach((line) => {
      if (line.trim()) {
        const fields = line.split(",");
        if (
          fields.length >=
          Math.max(
            tripIdIndex,
            arrivalTimeIndex,
            departureTimeIndex,
            stopIdIndex,
            stopSequenceIndex,
          ) +
            1
        ) {
          const tripId = fields[tripIdIndex]?.trim();
          const stopId = fields[stopIdIndex]?.trim();
          const arrivalTime = fields[arrivalTimeIndex]?.trim();
          const departureTime = fields[departureTimeIndex]?.trim();
          const stopSequence = parseInt(fields[stopSequenceIndex]?.trim());

          if (
            tripId &&
            stopId &&
            arrivalTime &&
            departureTime &&
            !isNaN(stopSequence)
          ) {
            if (!this.stopTimes.has(tripId)) {
              this.stopTimes.set(tripId, []);
            }
            this.stopTimes.get(tripId)?.push({
              tripId,
              arrivalTime,
              departureTime,
              stopId,
              stopSequence,
            });
          }
        }
      }
    });

    // Sort stop times by sequence
    for (const [tripId, stopTimes] of this.stopTimes) {
      stopTimes.sort((a, b) => a.stopSequence - b.stopSequence);
    }

    console.log(`Loaded stop times for ${this.stopTimes.size} trips`);
  }

  private async buildRouteStopsMapping(): Promise<void> {
    // Build mapping of routes to stops
    for (const [tripId, trip] of this.trips) {
      const stopTimes = this.stopTimes.get(tripId);
      if (stopTimes) {
        if (!this.routeStops.has(trip.routeId)) {
          this.routeStops.set(trip.routeId, []);
        }
        const routeStopIds = this.routeStops.get(trip.routeId)!;

        stopTimes.forEach((stopTime) => {
          if (!routeStopIds.includes(stopTime.stopId)) {
            routeStopIds.push(stopTime.stopId);
          }
        });
      }
    }

    console.log(`Built route-stops mapping for ${this.routeStops.size} routes`);
  }

  private getOrCreateRoute(routeId: string): GTFSRoute {
    let route = this.routes.get(routeId);
    if (!route) {
      // Create a basic route entry if none exists
      const [shortName] = routeId.split("-");
      route = {
        routeId,
        shortName: shortName || routeId,
        longName: routeId,
        routeColor: "000000", // Default to black
        routeTextColor: "FFFFFF", // Default to white
      };
      this.routes.set(routeId, route);
      console.log(`Created dynamic route entry for ID: ${routeId}`);
    }
    return route;
  }

  async getNextArrivals(
    stopId: string,
    routeFilter?: string,
    maxArrivals: number = 5,
  ): Promise<BusArrival[]> {
    console.log(
      `Fetching arrivals for stop ID: ${stopId}${routeFilter ? `, route: ${routeFilter}` : ""}`,
    );
    console.log(`Requesting GTFS-realtime feed from: ${this.tripUpdatesUrl}`);

    const response = await fetch(this.tripUpdatesUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch GTFS feed: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    console.log(`Received feed data of size: ${buffer.byteLength} bytes`);

    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer),
    );

    console.log(`Decoded feed with ${feed.entity.length} entities`);

    // Enhanced to store trip information with delays and uncertainties
    const arrivals = new Map<
      string,
      Array<{
        time: number;
        tripId: string;
        delay?: number;
        uncertainty?: number;
        scheduleRelationship?: string;
      }>
    >();

    const currentTime = Math.floor(Date.now() / 1000);

    // Process GTFS-realtime feed
    let matchingUpdates = 0;
    feed.entity.forEach((entity) => {
      if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
        const tripId = entity.tripUpdate.trip?.tripId;
        const routeId = entity.tripUpdate?.trip?.routeId;

        // Apply route filter if specified
        if (routeFilter && routeId !== routeFilter) {
          return;
        }

        console.log(
          `Processing trip update for trip ID: ${tripId}, route: ${routeId}`,
        );

        entity.tripUpdate.stopTimeUpdate.forEach((update) => {
          if (
            update.stopId === stopId &&
            update.arrival &&
            update.arrival.time &&
            tripId &&
            routeId
          ) {
            const arrivalTime = Number(update.arrival.time);

            // Only include future arrivals (within next 2 hours)
            if (arrivalTime > currentTime && arrivalTime < currentTime + 7200) {
              console.log(
                `  Match found - Route ID: ${routeId}, Arrival: ${new Date(arrivalTime * 1000).toISOString()}`,
              );

              if (!arrivals.has(routeId)) {
                arrivals.set(routeId, []);
              }

              arrivals.get(routeId)?.push({
                time: arrivalTime,
                tripId,
                delay: update.arrival.delay || 0,
                uncertainty: update.arrival.uncertainty || undefined,
                scheduleRelationship: update.scheduleRelationship
                  ? GtfsRealtimeBindings.transit_realtime.TripUpdate
                      .StopTimeUpdate.ScheduleRelationship[
                      update.scheduleRelationship
                    ]
                  : undefined,
              });
              matchingUpdates++;
            }
          }
        });
      }
    });

    console.log(`Found ${matchingUpdates} matching updates for stop ${stopId}`);

    // Format results with enhanced timing information
    console.log(`Processing ${arrivals.size} unique routes with arrivals`);

    const results: BusArrival[] = [];
    for (const [routeId, arrivalData] of arrivals) {
      console.log(
        `Processing route ${routeId} with ${arrivalData.length} arrival times`,
      );

      const route = this.routes.get(routeId);
      if (route) {
        // Sort by time and take requested number of arrivals
        const sortedArrivals = arrivalData
          .sort((a, b) => a.time - b.time)
          .slice(0, maxArrivals);

        console.log(
          `  Route details found - Short name: ${route.shortName}, Long name: ${route.longName}`,
        );
        console.log(
          `  Arrival times: ${sortedArrivals.map((a) => new Date(a.time * 1000).toISOString())}`,
        );

        // Get headsigns and enhanced timing info for each arrival
        const arrivalTimesWithHeadsigns = sortedArrivals.map((arrival) => {
          const trip = this.trips.get(arrival.tripId);
          const minutesUntilArrival = Math.floor(
            (arrival.time - currentTime) / 60,
          );

          return {
            time: arrival.time,
            headsign: trip?.tripHeadsign || "",
            minutesUntilArrival,
            delaySeconds: arrival.delay || 0,
            isRealTime: arrival.scheduleRelationship !== "SCHEDULED",
            uncertainty: arrival.uncertainty,
            status: this.getArrivalStatus(
              minutesUntilArrival,
              arrival.delay || 0,
            ),
          };
        });

        results.push({
          stopId,
          routeId,
          routeShortName: route.shortName,
          routeLongName: route.longName,
          routeColor: route.routeColor,
          routeTextColor: route.routeTextColor,
          tripHeadsign: arrivalTimesWithHeadsigns[0]?.headsign || "",
          arrivalTimes: arrivalTimesWithHeadsigns,
        });
      } else {
        console.warn(`  No route details found for route ID: ${routeId}`);
      }
    }

    return results;
  }

  private getArrivalStatus(minutesUntil: number, delaySeconds: number): string {
    if (minutesUntil <= 1) return "Arriving";
    if (minutesUntil <= 2) return "Due";
    if (delaySeconds > 300) return "Delayed";
    if (delaySeconds < -60) return "Early";
    return `${minutesUntil} min`;
  }

  private getDepartureStatus(minutesUntil: number): string {
    if (minutesUntil <= 1) return "Departing";
    if (minutesUntil <= 2) return "Due";
    return `${minutesUntil} min`;
  }

  // Parse GTFS time format (HH:MM:SS) to today's timestamp
  private parseGtfsTime(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Handle times past midnight (e.g., 24:30:00, 25:15:00)
    if (hours >= 24) {
      today.setDate(today.getDate() + 1);
      today.setHours(hours - 24, minutes, seconds, 0);
    } else {
      today.setHours(hours, minutes, seconds, 0);
    }

    return Math.floor(today.getTime() / 1000);
  }

  // Get scheduled departures for a stop
  async getScheduledDepartures(
    stopId: string,
    routeFilter?: string,
    maxDepartures: number = 5,
  ): Promise<BusDeparture[]> {
    console.log(
      `Fetching scheduled departures for stop ID: ${stopId}${routeFilter ? `, route: ${routeFilter}` : ""}`,
    );

    const currentTime = Math.floor(Date.now() / 1000);
    const departures = new Map<
      string,
      Array<{
        time: number;
        tripId: string;
      }>
    >();

    // Process all trips and their stop times to find departures at this stop
    for (const [tripId, stopTimes] of this.stopTimes) {
      const trip = this.trips.get(tripId);
      if (!trip) continue;

      // Apply route filter if specified
      if (routeFilter && trip.routeId !== routeFilter) continue;

      // Find the stop time for this stop
      const stopTime = stopTimes.find((st) => st.stopId === stopId);
      if (!stopTime) continue;

      const departureTime = this.parseGtfsTime(stopTime.departureTime);

      // Only include future departures within the next 24 hours
      if (departureTime > currentTime && departureTime < currentTime + 86400) {
        if (!departures.has(trip.routeId)) {
          departures.set(trip.routeId, []);
        }
        departures.get(trip.routeId)?.push({
          time: departureTime,
          tripId,
        });
      }
    }

    const results: BusDeparture[] = [];

    // Convert to BusDeparture format
    for (const [routeId, departureData] of departures) {
      console.log(
        `Processing route ${routeId} with ${departureData.length} departure times`,
      );

      const route = this.routes.get(routeId);
      if (route) {
        // Deduplicate departures by time - GTFS data often contains multiple trips for the same route
        // that have identical departure times from the same stop. This can happen due to:
        // 1. Multiple service calendars (weekday/weekend/holiday variants with same schedules)
        // 2. Multiple trip patterns (express/local/limited variants departing at same time)
        // 3. Different directional trips or slight route variations under same route ID
        // Without deduplication, each departure time appears multiple times in the API response
        const uniqueDepartures = new Map<
          number,
          { time: number; tripId: string }
        >();
        departureData.forEach((departure) => {
          if (!uniqueDepartures.has(departure.time)) {
            uniqueDepartures.set(departure.time, departure);
          }
        });

        console.log(
          `  Before deduplication: ${departureData.length} departures, after deduplication: ${uniqueDepartures.size} departures`,
        );

        const sortedDepartures = Array.from(uniqueDepartures.values())
          .sort((a, b) => a.time - b.time)
          .slice(0, maxDepartures);

        console.log(
          `  Route details found - Short name: ${route.shortName}, Long name: ${route.longName}`,
        );
        console.log(
          `  Departure times: ${sortedDepartures.map((d) => new Date(d.time * 1000).toISOString())}`,
        );

        // Get headsigns and timing info for each departure
        const departureTimesWithHeadsigns = sortedDepartures.map(
          (departure) => {
            const trip = this.trips.get(departure.tripId);
            const minutesUntilDeparture = Math.floor(
              (departure.time - currentTime) / 60,
            );

            return {
              time: departure.time,
              headsign: trip?.tripHeadsign || "",
              minutesUntilDeparture,
              isScheduled: true,
              status: this.getDepartureStatus(minutesUntilDeparture),
            };
          },
        );

        results.push({
          stopId,
          routeId,
          routeShortName: route.shortName,
          routeLongName: route.longName,
          routeColor: route.routeColor,
          routeTextColor: route.routeTextColor,
          tripHeadsign: departureTimesWithHeadsigns[0]?.headsign || "",
          departureTimes: departureTimesWithHeadsigns,
        });
      }
    }

    return results;
  }

  // Get scheduled departures for a specific route at a stop
  async getScheduledDeparturesForRoute(
    stopId: string,
    routeId: string,
  ): Promise<BusDeparture[]> {
    return this.getScheduledDepartures(stopId, routeId, 10);
  }

  // Get the next scheduled departure for a specific route at a stop
  async getNextScheduledDepartureForRoute(
    stopId: string,
    routeId: string,
  ): Promise<BusDeparture | null> {
    const departures = await this.getScheduledDepartures(stopId, routeId, 1);
    return departures.length > 0 ? departures[0] : null;
  }

  // Enhanced method for live updates with route filtering
  async getLiveArrivalsForRoute(
    stopId: string,
    routeId: string,
  ): Promise<BusArrival[]> {
    return this.getNextArrivals(stopId, routeId, 10);
  }

  // Method to get the next single arrival for a specific route
  async getNextArrivalForRoute(
    stopId: string,
    routeId: string,
  ): Promise<BusArrival | null> {
    const arrivals = await this.getNextArrivals(stopId, routeId, 1);
    return arrivals.length > 0 ? arrivals[0] : null;
  }

  async getNearbyStops(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500,
  ): Promise<NearbyStop[]> {
    const nearbyStops: NearbyStop[] = [];

    for (const [stopId, stop] of this.stops) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        stop.stopLat,
        stop.stopLon,
      );

      if (distance <= radiusMeters) {
        nearbyStops.push({
          stop,
          distance: Math.round(distance),
        });
      }
    }

    // Sort by distance
    nearbyStops.sort((a, b) => a.distance - b.distance);

    return nearbyStops;
  }

  async getVehiclePositions(routeId?: string): Promise<VehiclePosition[]> {
    console.log(`Fetching vehicle positions from: ${this.vehiclePositionsUrl}`);

    const response = await fetch(this.vehiclePositionsUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch vehicle positions: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer),
    );

    const vehicles: VehiclePosition[] = [];

    feed.entity.forEach((entity) => {
      if (entity.vehicle && entity.vehicle.position) {
        const vehicle = entity.vehicle;
        const position = vehicle.position;
        const trip = vehicle.trip;

        // Filter by route if specified
        if (routeId && trip?.routeId !== routeId) {
          return;
        }

        if (
          position &&
          position.latitude !== undefined &&
          position.longitude !== undefined
        ) {
          vehicles.push({
            vehicleId: vehicle.vehicle?.id || entity.id,
            routeId: trip?.routeId || "",
            tripId: trip?.tripId || undefined,
            latitude: position.latitude,
            longitude: position.longitude,
            bearing: position.bearing || undefined,
            speed: position.speed || undefined,
            timestamp: vehicle.timestamp
              ? Number(vehicle.timestamp)
              : Date.now() / 1000,
            occupancyStatus: vehicle.occupancyStatus
              ? GtfsRealtimeBindings.transit_realtime.VehiclePosition
                  .OccupancyStatus[vehicle.occupancyStatus]
              : undefined,
            congestionLevel: vehicle.congestionLevel
              ? GtfsRealtimeBindings.transit_realtime.VehiclePosition
                  .CongestionLevel[vehicle.congestionLevel]
              : undefined,
          });
        }
      }
    });

    return vehicles;
  }

  async getServiceAlerts(
    routeId?: string,
    stopId?: string,
  ): Promise<ServiceAlert[]> {
    console.log(`Fetching service alerts from: ${this.alertsUrl}`);

    const response = await fetch(this.alertsUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch service alerts: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer),
    );

    const alerts: ServiceAlert[] = [];

    feed.entity.forEach((entity) => {
      if (entity.alert) {
        const alert = entity.alert;

        // Filter by route or stop if specified
        if (routeId || stopId) {
          const matchesFilter = alert.informedEntity?.some(
            (informed) =>
              (routeId && informed.routeId === routeId) ||
              (stopId && informed.stopId === stopId),
          );

          if (!matchesFilter) {
            return;
          }
        }

        alerts.push({
          alertId: entity.id,
          headerText: alert.headerText?.translation?.[0]?.text || "",
          descriptionText: alert.descriptionText?.translation?.[0]?.text || "",
          severity: alert.severityLevel
            ? GtfsRealtimeBindings.transit_realtime.Alert.SeverityLevel[
                alert.severityLevel
              ]
            : undefined,
          effect: alert.effect
            ? GtfsRealtimeBindings.transit_realtime.Alert.Effect[alert.effect]
            : undefined,
          activePeriods:
            alert.activePeriod?.map((period) => ({
              start: period.start ? Number(period.start) : undefined,
              end: period.end ? Number(period.end) : undefined,
            })) || [],
          informedEntities:
            alert.informedEntity?.map((informed) => ({
              routeId: informed.routeId || undefined,
              stopId: informed.stopId || undefined,
              agencyId: informed.agencyId || undefined,
            })) || [],
        });
      }
    });

    return alerts;
  }

  getStop(stopId: string): GTFSStop | undefined {
    return this.stops.get(stopId);
  }

  getAllRoutes(): GTFSRoute[] {
    return Array.from(this.routes.values());
  }

  getRoute(routeId: string): GTFSRoute | undefined {
    return this.routes.get(routeId);
  }

  getRouteWithStops(routeId: string): RouteWithStops | undefined {
    const route = this.routes.get(routeId);
    if (!route) return undefined;

    const stopIds = this.routeStops.get(routeId) || [];
    const stops = stopIds
      .map((stopId) => this.stops.get(stopId))
      .filter(Boolean) as GTFSStop[];

    return {
      route,
      stops,
    };
  }

  getTripDetails(tripId: string): TripDetails | undefined {
    const trip = this.trips.get(tripId);
    if (!trip) return undefined;

    const route = this.routes.get(trip.routeId);
    const stopTimes = this.stopTimes.get(tripId) || [];

    if (!route) return undefined;

    return {
      trip,
      route,
      stopTimes,
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
