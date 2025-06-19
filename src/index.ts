import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { GTFSService } from "./services/gtfsService";
import {
  env,
  logConfigSummary,
  isProduction,
  isDevelopment,
} from "./config/environment";
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  handleAsync,
  validateLatLon,
  validatePositiveInteger,
  validatePositiveNumber,
} from "./utils/api";

// Create Express app
const app = express();

// Log configuration on startup
console.log("🚀 Starting BC Transit GTFS API Server...");
logConfigSummary();

// Trust proxy if configured (important for rate limiting behind load balancers)
if (env.trustProxy) {
  app.set("trust proxy", true);
}

// Security middleware
if (env.enableSecurityHeaders) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );
}

// Compression middleware
if (env.enableCompression) {
  app.use(compression());
}

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: env.devCorsAllOrigins ? true : env.corsOrigin.split(","),
  methods: env.corsMethods.split(","),
  allowedHeaders: env.corsAllowedHeaders.split(","),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request timeout middleware
app.use((req, res, next) => {
  res.setTimeout(env.requestTimeout, () => {
    res.status(408).json(createErrorResponse("Request timeout"));
  });
  next();
});

// Access logging
if (env.accessLogEnabled) {
  const logFormat = isProduction()
    ? "combined"
    : ":method :url :status :res[content-length] - :response-time ms";
  app.use(morgan(logFormat));
}

// API Key validation middleware
const validateApiKey = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!env.apiKeyRequired) {
    return next();
  }

  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res
      .status(401)
      .json(
        createErrorResponse("API key required", "Include X-API-Key header"),
      );
  }

  // In production, you'd validate against a database or service
  if (env.adminApiKey && apiKey === env.adminApiKey) {
    return next();
  }

  return res.status(403).json(createErrorResponse("Invalid API key"));
};

// Rate limiting configuration
const createRateLimit = (
  windowMs: number,
  maxRequests: number,
  message: string,
) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: createErrorResponse(message),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for whitelisted IPs
      const clientIp = req.ip || req.connection.remoteAddress;
      return env.rateLimitSkipIps.includes(clientIp || "");
    },
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || "unknown";
    },
  });
};

// Apply rate limiting if enabled
if (env.rateLimitingEnabled) {
  // General rate limiting
  const generalRateLimit = createRateLimit(
    env.rateLimitWindowMs,
    env.rateLimitMaxRequests,
    "Too many requests, please try again later",
  );
  app.use("/api", generalRateLimit);

  // Strict rate limiting for expensive operations
  const strictRateLimit = createRateLimit(
    env.strictRateLimitWindowMs,
    env.strictRateLimitMaxRequests,
    "Rate limit exceeded for this endpoint",
  );

  // Apply strict rate limiting to specific endpoints
  const nearbyStopsRateLimit = createRateLimit(
    env.nearbyStopsRateLimitWindowMs,
    env.nearbyStopsRateLimitMaxRequests,
    "Too many nearby stops requests",
  );
  app.use("/api/stops/nearby", nearbyStopsRateLimit);
  app.use("/api/vehicles", strictRateLimit);
  app.use("/api/alerts", strictRateLimit);
}

// Apply API key validation to all API routes
app.use("/api", validateApiKey);

// Performance monitoring middleware
if (env.performanceMonitoring) {
  app.use("/api", (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        // Log slow requests
        console.warn(
          `Slow request: ${req.method} ${req.path} took ${duration}ms`,
        );
      }
    });

    next();
  });
}

// Initialize GTFS service with environment configuration
const gtfsService = new GTFSService(env.gtfsRealtimeUrl, env.gtfsStaticUrl, {
  vehiclePositionsUrl: env.gtfsVehiclePositionsUrl,
  alertsUrl: env.gtfsAlertsUrl,
  cacheTtl: env.gtfsRealtimeCacheTtl,
  staticRefreshInterval: env.gtfsStaticRefreshInterval,
});

// Initialize the service before starting the server
gtfsService
  .initialize()
  .then(() => {
    console.log("✅ GTFS service initialized successfully");

    // Health check endpoint (no rate limiting)
    app.get("/api/health", (req, res) => {
      const healthData: any = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: "1.0.0",
        environment: env.nodeEnv,
        features: {
          vehicleTracking: env.enableVehicleTracking,
          serviceAlerts: env.enableServiceAlerts,
          nearbyStops: env.enableNearbyStops,
          rateLimiting: env.rateLimitingEnabled,
          caching: env.cacheEnabled,
        },
      };

      if (isDevelopment()) {
        healthData.memory = process.memoryUsage();
        healthData.config = {
          gtfsRealtimeUrl: env.gtfsRealtimeUrl.replace(/\?.+/, "..."),
          gtfsStaticUrl: env.gtfsStaticUrl.replace(/\?.+/, "..."),
        };
      }

      res.json(createSuccessResponse(healthData));
    });

    // Bus arrivals endpoint
    app.get(
      "/api/arrivals/:stopId",
      handleAsync(async (req, res) => {
        const { routeId, max } = req.query;
        const maxArrivals = Math.min(
          validatePositiveInteger(max as string, 5),
          env.maxArrivalsPerRoute,
        );

        if (env.debug) {
          console.log(
            `Arrivals request: stop=${req.params.stopId}, route=${routeId}, max=${maxArrivals}`,
          );
        }

        const arrivals = await gtfsService.getNextArrivals(
          req.params.stopId,
          routeId as string,
          maxArrivals,
        );

        res.json(
          createSuccessResponse({
            stopId: req.params.stopId,
            arrivalCount: arrivals.length,
            arrivals: arrivals,
            isLiveData: true,
            lastUpdated: new Date().toISOString(),
            cacheTtl: env.cacheArrivalsTtl,
            ...(routeId && { routeFilter: routeId as string }),
          }),
        );
      }),
    );

    // Live arrivals for specific route at stop
    app.get(
      "/api/arrivals/:stopId/route/:routeId",
      handleAsync(async (req, res) => {
        const arrivals = await gtfsService.getLiveArrivalsForRoute(
          req.params.stopId,
          req.params.routeId,
        );

        res.json(
          createSuccessResponse({
            stopId: req.params.stopId,
            routeId: req.params.routeId,
            arrivalCount: arrivals.length,
            arrivals: arrivals,
            isLiveData: true,
            lastUpdated: new Date().toISOString(),
          }),
        );
      }),
    );

    // Next single arrival for route at stop
    app.get(
      "/api/arrivals/:stopId/route/:routeId/next",
      handleAsync(async (req, res) => {
        const nextArrival = await gtfsService.getNextArrivalForRoute(
          req.params.stopId,
          req.params.routeId,
        );

        if (!nextArrival) {
          res
            .status(404)
            .json(createErrorResponse("No upcoming arrivals found"));
          return;
        }

        res.json(
          createSuccessResponse({
            stopId: req.params.stopId,
            routeId: req.params.routeId,
            nextArrival: nextArrival,
            isLiveData: true,
            lastUpdated: new Date().toISOString(),
          }),
        );
      }),
    );

    // Scheduled departures endpoint
    app.get(
      "/api/departures/:stopId",
      handleAsync(async (req, res) => {
        const { routeId, max } = req.query;
        const maxDepartures = Math.min(
          validatePositiveInteger(max as string, 5),
          env.maxArrivalsPerRoute,
        );

        if (env.debug) {
          console.log(
            `Departures request: stop=${req.params.stopId}, route=${routeId}, max=${maxDepartures}`,
          );
        }

        const departures = await gtfsService.getScheduledDepartures(
          req.params.stopId,
          routeId as string,
          maxDepartures,
        );

        res.json(
          createSuccessResponse({
            stopId: req.params.stopId,
            departureCount: departures.length,
            departures: departures,
            isLiveData: false,
            lastUpdated: new Date().toISOString(),
            cacheTtl: env.cacheStaticDataTtl,
            ...(routeId && { routeFilter: routeId as string }),
          }),
        );
      }),
    );

    // Scheduled departures for specific route at stop
    app.get(
      "/api/departures/:stopId/route/:routeId",
      handleAsync(async (req, res) => {
        const departures = await gtfsService.getScheduledDeparturesForRoute(
          req.params.stopId,
          req.params.routeId,
        );

        res.json(
          createSuccessResponse({
            stopId: req.params.stopId,
            routeId: req.params.routeId,
            departureCount: departures.length,
            departures: departures,
            isLiveData: false,
            lastUpdated: new Date().toISOString(),
          }),
        );
      }),
    );

    // Next scheduled departure for route at stop
    app.get(
      "/api/departures/:stopId/route/:routeId/next",
      handleAsync(async (req, res) => {
        const nextDeparture =
          await gtfsService.getNextScheduledDepartureForRoute(
            req.params.stopId,
            req.params.routeId,
          );

        if (!nextDeparture) {
          res
            .status(404)
            .json(createErrorResponse("No upcoming departures found"));
          return;
        }

        res.json(
          createSuccessResponse({
            stopId: req.params.stopId,
            routeId: req.params.routeId,
            nextDeparture: nextDeparture,
            isLiveData: false,
            lastUpdated: new Date().toISOString(),
          }),
        );
      }),
    );

    // Nearby stops endpoint
    if (env.enableNearbyStops) {
      app.get(
        "/api/stops/nearby",
        handleAsync(async (req, res) => {
          const { lat, lon, radius } = req.query;

          const coordinates = validateLatLon(lat as string, lon as string);
          if (!coordinates) {
            res
              .status(400)
              .json(
                createErrorResponse(
                  "Invalid or missing latitude/longitude parameters",
                  "Provide valid lat and lon query parameters",
                ),
              );
            return;
          }

          const radiusMeters = Math.min(
            validatePositiveNumber(radius as string, 500),
            env.maxNearbyStopsRadius,
          );

          const nearbyStops = await gtfsService.getNearbyStops(
            coordinates.lat,
            coordinates.lon,
            radiusMeters,
          );

          res.json(
            createSuccessResponse({
              location: {
                latitude: coordinates.lat,
                longitude: coordinates.lon,
              },
              radius: radiusMeters,
              maxRadius: env.maxNearbyStopsRadius,
              stopCount: nearbyStops.length,
              stops: nearbyStops,
            }),
          );
        }),
      );
    }

    // Stop details endpoint
    app.get(
      "/api/stops/:stopId",
      handleAsync(async (req, res) => {
        const stop = gtfsService.getStop(req.params.stopId);

        if (!stop) {
          res.status(404).json(createErrorResponse("Stop not found"));
          return;
        }

        res.json(createSuccessResponse(stop));
      }),
    );

    // Vehicle positions endpoint
    if (env.enableVehicleTracking) {
      app.get(
        "/api/vehicles",
        handleAsync(async (req, res) => {
          const { routeId } = req.query;
          const vehicles = await gtfsService.getVehiclePositions(
            routeId as string,
          );

          res.json(
            createSuccessResponse({
              vehicleCount: vehicles.length,
              vehicles: vehicles,
              lastUpdated: new Date().toISOString(),
              cacheTtl: env.cacheVehiclesTtl,
              ...(routeId && { routeId: routeId as string }),
            }),
          );
        }),
      );

      // Vehicle positions for specific route
      app.get(
        "/api/vehicles/route/:routeId",
        handleAsync(async (req, res) => {
          const vehicles = await gtfsService.getVehiclePositions(
            req.params.routeId,
          );

          res.json(
            createSuccessResponse({
              routeId: req.params.routeId,
              vehicleCount: vehicles.length,
              vehicles: vehicles,
              lastUpdated: new Date().toISOString(),
            }),
          );
        }),
      );
    }

    // Service alerts endpoint
    if (env.enableServiceAlerts) {
      app.get(
        "/api/alerts",
        handleAsync(async (req, res) => {
          const { routeId, stopId } = req.query;
          const alerts = await gtfsService.getServiceAlerts(
            routeId as string,
            stopId as string,
          );

          res.json(
            createSuccessResponse({
              alertCount: alerts.length,
              alerts: alerts,
              lastUpdated: new Date().toISOString(),
              cacheTtl: env.cacheAlertsTtl,
              ...(routeId && { routeId: routeId as string }),
              ...(stopId && { stopId: stopId as string }),
            }),
          );
        }),
      );
    }

    // All routes endpoint
    app.get(
      "/api/routes",
      handleAsync(async (req, res) => {
        const { page = "1", limit = "50" } = req.query;
        const pageNum = validatePositiveInteger(page as string, 1);
        const limitNum = Math.min(
          validatePositiveInteger(limit as string, 50),
          100,
        );

        const allRoutes = gtfsService.getAllRoutes();
        const total = allRoutes.length;
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedRoutes = allRoutes.slice(startIndex, endIndex);

        res.json(
          createPaginatedResponse(paginatedRoutes, pageNum, limitNum, total),
        );
      }),
    );

    // Route details endpoint
    app.get(
      "/api/routes/:routeId",
      handleAsync(async (req, res) => {
        const route = gtfsService.getRoute(req.params.routeId);

        if (!route) {
          res.status(404).json(createErrorResponse("Route not found"));
          return;
        }

        res.json(createSuccessResponse(route));
      }),
    );

    // Route with stops endpoint
    app.get(
      "/api/routes/:routeId/stops",
      handleAsync(async (req, res) => {
        const routeWithStops = gtfsService.getRouteWithStops(
          req.params.routeId,
        );

        if (!routeWithStops) {
          res.status(404).json(createErrorResponse("Route not found"));
          return;
        }

        res.json(
          createSuccessResponse({
            route: routeWithStops.route,
            stopCount: routeWithStops.stops.length,
            stops: routeWithStops.stops,
          }),
        );
      }),
    );

    // Trip details endpoint
    app.get(
      "/api/trips/:tripId",
      handleAsync(async (req, res) => {
        const tripDetails = gtfsService.getTripDetails(req.params.tripId);

        if (!tripDetails) {
          res.status(404).json(createErrorResponse("Trip not found"));
          return;
        }

        res.json(createSuccessResponse(tripDetails));
      }),
    );

    // API documentation endpoint
    app.get("/api", (req, res) => {
      res.json(
        createSuccessResponse({
          title: "BC Transit GTFS API",
          version: "1.0.0",
          environment: env.nodeEnv,
          documentation:
            "https://github.com/yourusername/pebble-transit-server",
          features: {
            liveArrivals: true,
            vehicleTracking: env.enableVehicleTracking,
            serviceAlerts: env.enableServiceAlerts,
            nearbyStops: env.enableNearbyStops,
            rateLimiting: env.rateLimitingEnabled,
            authentication: env.apiKeyRequired,
          },
          limits: {
            maxArrivalsPerRoute: env.maxArrivalsPerRoute,
            maxNearbyStopsRadius: env.maxNearbyStopsRadius,
            rateLimit: env.rateLimitingEnabled
              ? {
                  windowMs: env.rateLimitWindowMs,
                  maxRequests: env.rateLimitMaxRequests,
                }
              : null,
          },
          endpoints: {
            arrivals: {
              path: "/api/arrivals/:stopId",
              method: "GET",
              description: "Get next bus arrivals for a specific stop",
              params: "routeId (optional filter), max (optional, default 5)",
            },
            liveArrivalsForRoute: {
              path: "/api/arrivals/:stopId/route/:routeId",
              method: "GET",
              description: "Get live arrivals for specific route at stop",
            },
            nextArrival: {
              path: "/api/arrivals/:stopId/route/:routeId/next",
              method: "GET",
              description: "Get the next single arrival for a route at stop",
            },
            departures: {
              path: "/api/departures/:stopId",
              method: "GET",
              description: "Get scheduled departures for a specific stop",
              params: "routeId (optional filter), max (optional, default 5)",
            },
            scheduledDeparturesForRoute: {
              path: "/api/departures/:stopId/route/:routeId",
              method: "GET",
              description:
                "Get scheduled departures for specific route at stop",
            },
            nextDeparture: {
              path: "/api/departures/:stopId/route/:routeId/next",
              method: "GET",
              description:
                "Get the next scheduled departure for a route at stop",
            },
            nearbyStops: env.enableNearbyStops
              ? {
                  path: "/api/stops/nearby",
                  method: "GET",
                  description: "Find stops near a location",
                  params: "lat, lon, radius (optional, default 500m)",
                }
              : { disabled: true },
            stopDetails: {
              path: "/api/stops/:stopId",
              method: "GET",
              description: "Get details for a specific stop",
            },
            vehicles: env.enableVehicleTracking
              ? {
                  path: "/api/vehicles",
                  method: "GET",
                  description: "Get real-time vehicle positions",
                  params: "routeId (optional filter)",
                }
              : { disabled: true },
            vehiclesByRoute: env.enableVehicleTracking
              ? {
                  path: "/api/vehicles/route/:routeId",
                  method: "GET",
                  description: "Get vehicles for a specific route",
                }
              : { disabled: true },
            alerts: env.enableServiceAlerts
              ? {
                  path: "/api/alerts",
                  method: "GET",
                  description: "Get service alerts",
                  params: "routeId, stopId (optional filters)",
                }
              : { disabled: true },
            routes: {
              path: "/api/routes",
              method: "GET",
              description: "Get all routes (paginated)",
              params: "page, limit",
            },
            routeDetails: {
              path: "/api/routes/:routeId",
              method: "GET",
              description: "Get details for a specific route",
            },
            routeStops: {
              path: "/api/routes/:routeId/stops",
              method: "GET",
              description: "Get all stops for a specific route",
            },
            tripDetails: {
              path: "/api/trips/:tripId",
              method: "GET",
              description: "Get details for a specific trip",
            },
            health: {
              path: "/api/health",
              method: "GET",
              description: "Health check endpoint",
            },
          },
        }),
      );
    });

    // 404 handler for API routes
    app.use("/api", (req, res) => {
      res
        .status(404)
        .json(
          createErrorResponse(
            "Endpoint not found",
            `${req.method} ${req.path} is not a valid API endpoint`,
          ),
        );
    });

    // Global error handler
    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        console.error("Unhandled error:", err);

        if (res.headersSent) {
          return next(err);
        }

        const errorResponse = createErrorResponse(
          "Internal server error",
          env.devDetailedErrors ? err.message : undefined,
        );

        res.status(500).json(errorResponse);
      },
    );

    // Set server timeouts
    const server = app.listen(env.port, env.host, () => {
      console.log(`✅ Server running at http://${env.host}:${env.port}`);
      console.log(`📚 API documentation: http://${env.host}:${env.port}/api`);
      console.log(`🔍 Health check: http://${env.host}:${env.port}/api/health`);

      if (env.rateLimitingEnabled) {
        console.log(
          `🛡️  Rate limiting enabled: ${env.rateLimitMaxRequests} requests per ${env.rateLimitWindowMs / 1000}s`,
        );
      }

      if (env.apiKeyRequired) {
        console.log(`🔐 API key authentication required`);
      }
    });

    // Set server timeouts
    server.keepAliveTimeout = env.keepAliveTimeout;
    server.headersTimeout = env.keepAliveTimeout + 1000;

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

      server.close((err) => {
        if (err) {
          console.error("Error during server shutdown:", err);
          process.exit(1);
        }

        console.log("✅ Server closed successfully");
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        console.error("⚠️  Forced shutdown due to timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  })
  .catch((error) => {
    console.error("❌ Failed to initialize GTFS service:", error);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
