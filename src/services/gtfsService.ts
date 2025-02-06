import fetch from "node-fetch";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { BusArrival, GTFSRoute } from "../types/gtfs";
import JSZip, { JSZipObject } from "jszip";

export class GTFSService {
  private readonly feedUrl: string;
  private readonly staticGtfsUrl: string;
  private routes: Map<string, GTFSRoute>;

  constructor(feedUrl: string, staticGtfsUrl: string) {
    this.feedUrl = feedUrl;
    this.staticGtfsUrl = staticGtfsUrl;
    this.routes = new Map();
  }

  async initialize(): Promise<void> {
    // Load static GTFS route data
    await this.loadRoutes();
  }

  private async loadRoutes(): Promise<void> {
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

      // Find routes.txt in the zip
      const routesFile = zipData.file("routes.txt");
      if (!routesFile) {
        throw new Error("routes.txt not found in GTFS zip");
      }

      const routesData = await routesFile.async("string");
      const lines = routesData.split("\n");
      console.log(`Loaded ${lines.length} lines from routes.txt`);

      const header = lines[0].trim();

      // Parse CSV data and populate routes map
      lines.slice(1).forEach((line, index) => {
        if (line.trim()) {
          // Skip empty lines
          const fields = line.split(",");
          if (fields.length >= 6) {
            // Ensure we have at least the required fields
            const routeId = fields[0].trim();
            const shortName = fields[1].trim();
            const longName = fields[2].trim();
            const routeColor = fields[4].trim();
            const routeTextColor = fields[5].trim();

            console.log(`Processing route line ${index + 1}:`, {
              routeId,
              shortName,
              longName,
              routeColor,
              routeTextColor,
            });

            this.routes.set(routeId, {
              routeId,
              shortName,
              longName,
              routeColor: routeColor || "000000",
              routeTextColor: routeTextColor || "FFFFFF",
            });
          } else {
            console.warn(`Skipping invalid route line ${index + 1}:`, line);
          }
        }
      });

      // Log the contents of our routes map
      console.log("\nLoaded routes:");
      for (const [routeId, route] of this.routes.entries()) {
        console.log(`${routeId}:`, route);
      }
    } catch (error) {
      console.error("Error loading routes.txt:", error);
      throw error;
    }
  }

  private async loadTrips(): Promise<void> {}

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

    const arrivals = new Map<string, number[]>();

    // Process GTFS-realtime feed
    let matchingUpdates = 0;
    feed.entity.forEach((entity) => {
      if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
        console.log(
          `Processing trip update for trip ID: ${entity.tripUpdate.trip?.tripId}`,
        );

        entity.tripUpdate.stopTimeUpdate.forEach((update) => {
          console.log(
            `  Stop update - Stop ID: ${update.stopId}, Arrival time: ${update?.arrival?.time}`,
          );

          if (
            update.stopId === stopId &&
            update.arrival &&
            update.arrival.time
          ) {
            const routeId = entity.tripUpdate?.trip?.routeId;
            console.log(`  Match found - Route ID: ${routeId}`);

            if (routeId) {
              if (!arrivals.has(routeId)) {
                arrivals.set(routeId, []);
              }
              arrivals.get(routeId)?.push(Number(update.arrival.time));
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
    for (const [routeId, times] of arrivals) {
      console.log(
        `Processing route ${routeId} with ${times.length} arrival times`,
      );

      const route = this.routes.get(routeId);
      if (route) {
        const sortedTimes = times.sort();
        console.log(
          `  Route details found - Short name: ${route.shortName}, Long name: ${route.longName}`,
        );
        console.log(
          `  Arrival times: ${sortedTimes.slice(0, 3).map((t) => new Date(t * 1000).toISOString())}`,
        );

        results.push({
          stopId,
          routeId,
          routeShortName: route.shortName,
          routeLongName: route.longName,
          routeColor: route.routeColor,
          routeTextColor: route.routeTextColor,
          arrivalTimes: sortedTimes.slice(0, 3), // Get next 3 arrivals
        });
      } else {
        console.warn(`  No route details found for route ID: ${routeId}`);
      }
    }

    return results;
  }
}
