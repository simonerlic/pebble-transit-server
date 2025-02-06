import express from "express";
import { GTFSService } from "./services/gtfsService";

const app = express();
const port = process.env.PORT || 3000;

// Initialize GTFS service
const gtfsService = new GTFSService(
  process.env.GTFS_REALTIME_URL ||
    "https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=48",
  process.env.GTFS_STATIC_URL ||
    "https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=48",
);

// Initialize the service before starting the server
gtfsService
  .initialize()
  .then(() => {
    app.get("/api/arrivals/:stopId", async (req, res) => {
      try {
        console.log(`Received request for stop ID: ${req.params.stopId}`);
        const arrivals = await gtfsService.getNextArrivals(req.params.stopId);
        console.log(`Returning ${arrivals.length} arrival predictions`);
        res.json({
          success: true,
          stopId: req.params.stopId,
          timestamp: new Date().toISOString(),
          arrivalCount: arrivals.length,
          arrivals: arrivals,
        });
      } catch (error) {
        console.error("Error fetching arrivals:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch arrivals",
          errorDetails:
            error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    });

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize GTFS service:", error);
    process.exit(1);
  });
