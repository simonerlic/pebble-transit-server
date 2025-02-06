import fetch from "node-fetch";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { BusArrival, GTFSRoute } from "../types/gtfs";
import JSZip from "jszip";

export class GTFSService {
  private readonly feedUrl: string;
  private readonly staticGtfsUrl: string;
  private routes: Map<string, GTFSRoute>;
  private trips: Map<string, GTFSTrip>;

  constructor(feedUrl: string, staticGtfsUrl: string) {
    this.feedUrl = feedUrl;
    this.staticGtfsUrl = staticGtfsUrl;
    this.routes = new Map();
    this.trips = new Map();
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

      // Load routes.txt
      await this.loadRoutes(zipData);

      // Load trips.txt
      await this.loadTrips(zipData);
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

  async getNextArrivals(stopId: string): Promise<BusArrival[]> {
    console.log(`Fetching arrivals for stop ID: ${stopId}`);
    console.log(`Requesting GTFS-realtime feed from: ${this.feedUrl}`);

    const response = await fetch(this.feedUrl);
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

    // Modified to store trip information along with times
    const arrivals = new Map<string, Array<{ time: number; tripId: string }>>();

    // Process GTFS-realtime feed
    let matchingUpdates = 0;
    feed.entity.forEach((entity) => {
      if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
        const tripId = entity.tripUpdate.trip?.tripId;
        console.log(`Processing trip update for trip ID: ${tripId}`);

        entity.tripUpdate.stopTimeUpdate.forEach((update) => {
          console.log(
            `  Stop update - Stop ID: ${update.stopId}, Arrival time: ${update?.arrival?.time}`,
          );

          if (
            update.stopId === stopId &&
            update.arrival &&
            update.arrival.time &&
            tripId
          ) {
            const routeId = entity.tripUpdate.trip?.routeId;
            console.log(`  Match found - Route ID: ${routeId}`);

            if (routeId) {
              if (!arrivals.has(routeId)) {
                arrivals.set(routeId, []);
              }
              arrivals.get(routeId)?.push({
                time: Number(update.arrival.time),
                tripId,
              });
              matchingUpdates++;
            }
          }
        });
      }
    });

    console.log(`Found ${matchingUpdates} matching updates for stop ${stopId}`);

    // Format results
    console.log(`Processing ${arrivals.size} unique routes with arrivals`);

    const results: BusArrival[] = [];
    for (const [routeId, arrivalData] of arrivals) {
      console.log(
        `Processing route ${routeId} with ${arrivalData.length} arrival times`,
      );

      const route = this.routes.get(routeId);
      if (route) {
        // Sort by time and take first 3 arrivals
        const sortedArrivals = arrivalData
          .sort((a, b) => a.time - b.time)
          .slice(0, 3);

        console.log(
          `  Route details found - Short name: ${route.shortName}, Long name: ${route.longName}`,
        );
        console.log(
          `  Arrival times: ${sortedArrivals.map((a) => new Date(a.time * 1000).toISOString())}`,
        );

        // Get headsigns for each arrival
        const arrivalTimesWithHeadsigns = sortedArrivals.map((arrival) => {
          const trip = this.trips.get(arrival.tripId);
          return {
            time: arrival.time,
            headsign: trip?.tripHeadsign || "",
          };
        });

        results.push({
          stopId,
          routeId,
          routeShortName: route.shortName,
          routeLongName: route.longName,
          routeColor: route.routeColor,
          routeTextColor: route.routeTextColor,
          arrivalTimes: arrivalTimesWithHeadsigns,
        });
      } else {
        console.warn(`  No route details found for route ID: ${routeId}`);
      }
    }

    return results;
  }
}
