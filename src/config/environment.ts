import { config } from 'dotenv';

// Load environment variables from .env file
config();

export interface EnvironmentConfig {
  // Server Configuration
  nodeEnv: string;
  port: number;
  host: string;
  debug: boolean;

  // GTFS Data Sources
  gtfsRealtimeUrl: string;
  gtfsVehiclePositionsUrl: string;
  gtfsAlertsUrl: string;
  gtfsStaticUrl: string;
  gtfsStaticRefreshInterval: number;
  gtfsRealtimeCacheTtl: number;

  // API Security
  apiKeyRequired: boolean;
  adminApiKey?: string;
  corsOrigin: string;
  corsMethods: string;
  corsAllowedHeaders: string;
  enableSecurityHeaders: boolean;

  // Rate Limiting
  rateLimitingEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  strictRateLimitWindowMs: number;
  strictRateLimitMaxRequests: number;
  nearbyStopsRateLimitWindowMs: number;
  nearbyStopsRateLimitMaxRequests: number;
  rateLimitSkipIps: string[];

  // Caching
  cacheEnabled: boolean;
  cacheStaticDataTtl: number;
  cacheArrivalsTtl: number;
  cacheVehiclesTtl: number;
  cacheAlertsTtl: number;
  maxCacheSize: number;

  // Monitoring & Logging
  logLevel: string;
  accessLogEnabled: boolean;
  performanceMonitoring: boolean;
  healthCheckTimeout: number;

  // Feature Flags
  enableVehicleTracking: boolean;
  enableServiceAlerts: boolean;
  enableNearbyStops: boolean;
  enableAnalytics: boolean;
  maxNearbyStopsRadius: number;
  maxArrivalsPerRoute: number;

  // Production Optimizations
  clusterWorkers: number;
  enableCompression: boolean;
  trustProxy: boolean;
  requestTimeout: number;
  keepAliveTimeout: number;

  // Development Settings
  devCorsAllOrigins: boolean;
  devDetailedErrors: boolean;
  useMockData: boolean;
  simulateNetworkDelay: number;
}

// Helper function to parse boolean values
const parseBoolean = (value: string | undefined, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// Helper function to parse integer values
const parseInteger = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to parse comma-separated strings
const parseArray = (value: string | undefined, defaultValue: string[] = []): string[] => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

// Validate required environment variables
const validateRequiredEnvVars = (): void => {
  const required = [
    'GTFS_REALTIME_URL',
    'GTFS_STATIC_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Load and validate environment configuration
export const loadEnvironmentConfig = (): EnvironmentConfig => {
  // Validate required variables first
  validateRequiredEnvVars();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  const config: EnvironmentConfig = {
    // Server Configuration
    nodeEnv,
    port: parseInteger(process.env.PORT, 3000),
    host: process.env.HOST || '0.0.0.0',
    debug: parseBoolean(process.env.DEBUG, isDevelopment),

    // GTFS Data Sources
    gtfsRealtimeUrl: process.env.GTFS_REALTIME_URL!,
    gtfsVehiclePositionsUrl: process.env.GTFS_VEHICLE_POSITIONS_URL ||
      process.env.GTFS_REALTIME_URL!.replace('/tripupdates.pb', '/vehiclepositions.pb'),
    gtfsAlertsUrl: process.env.GTFS_ALERTS_URL ||
      process.env.GTFS_REALTIME_URL!.replace('/tripupdates.pb', '/alerts.pb'),
    gtfsStaticUrl: process.env.GTFS_STATIC_URL!,
    gtfsStaticRefreshInterval: parseInteger(process.env.GTFS_STATIC_REFRESH_INTERVAL, 3600000),
    gtfsRealtimeCacheTtl: parseInteger(process.env.GTFS_REALTIME_CACHE_TTL, 30000),

    // API Security
    apiKeyRequired: parseBoolean(process.env.API_KEY_REQUIRED, false),
    adminApiKey: process.env.ADMIN_API_KEY,
    corsOrigin: process.env.CORS_ORIGIN || (isDevelopment ? '*' : 'https://yourdomain.com'),
    corsMethods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
    corsAllowedHeaders: process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,X-API-Key',
    enableSecurityHeaders: parseBoolean(process.env.ENABLE_SECURITY_HEADERS, isProduction),

    // Rate Limiting
    rateLimitingEnabled: parseBoolean(process.env.RATE_LIMITING_ENABLED, isProduction),
    rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 900000), // 15 minutes
    rateLimitMaxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    strictRateLimitWindowMs: parseInteger(process.env.STRICT_RATE_LIMIT_WINDOW_MS, 60000),
    strictRateLimitMaxRequests: parseInteger(process.env.STRICT_RATE_LIMIT_MAX_REQUESTS, 20),
    nearbyStopsRateLimitWindowMs: parseInteger(process.env.NEARBY_STOPS_RATE_LIMIT_WINDOW_MS, 60000),
    nearbyStopsRateLimitMaxRequests: parseInteger(process.env.NEARBY_STOPS_RATE_LIMIT_MAX_REQUESTS, 30),
    rateLimitSkipIps: parseArray(process.env.RATE_LIMIT_SKIP_IPS),

    // Caching
    cacheEnabled: parseBoolean(process.env.CACHE_ENABLED, true),
    cacheStaticDataTtl: parseInteger(process.env.CACHE_STATIC_DATA_TTL, 3600),
    cacheArrivalsTtl: parseInteger(process.env.CACHE_ARRIVALS_TTL, 30),
    cacheVehiclesTtl: parseInteger(process.env.CACHE_VEHICLES_TTL, 15),
    cacheAlertsTtl: parseInteger(process.env.CACHE_ALERTS_TTL, 60),
    maxCacheSize: parseInteger(process.env.MAX_CACHE_SIZE, 1000),

    // Monitoring & Logging
    logLevel: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    accessLogEnabled: parseBoolean(process.env.ACCESS_LOG_ENABLED, isProduction),
    performanceMonitoring: parseBoolean(process.env.PERFORMANCE_MONITORING, isProduction),
    healthCheckTimeout: parseInteger(process.env.HEALTH_CHECK_TIMEOUT, 5000),

    // Feature Flags
    enableVehicleTracking: parseBoolean(process.env.ENABLE_VEHICLE_TRACKING, true),
    enableServiceAlerts: parseBoolean(process.env.ENABLE_SERVICE_ALERTS, true),
    enableNearbyStops: parseBoolean(process.env.ENABLE_NEARBY_STOPS, true),
    enableAnalytics: parseBoolean(process.env.ENABLE_ANALYTICS, false),
    maxNearbyStopsRadius: parseInteger(process.env.MAX_NEARBY_STOPS_RADIUS, 5000),
    maxArrivalsPerRoute: parseInteger(process.env.MAX_ARRIVALS_PER_ROUTE, 10),

    // Production Optimizations
    clusterWorkers: parseInteger(process.env.CLUSTER_WORKERS, 0),
    enableCompression: parseBoolean(process.env.ENABLE_COMPRESSION, isProduction),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
    requestTimeout: parseInteger(process.env.REQUEST_TIMEOUT, 30000),
    keepAliveTimeout: parseInteger(process.env.KEEP_ALIVE_TIMEOUT, 65000),

    // Development Settings
    devCorsAllOrigins: parseBoolean(process.env.DEV_CORS_ALL_ORIGINS, isDevelopment),
    devDetailedErrors: parseBoolean(process.env.DEV_DETAILED_ERRORS, isDevelopment),
    useMockData: parseBoolean(process.env.USE_MOCK_DATA, false),
    simulateNetworkDelay: parseInteger(process.env.SIMULATE_NETWORK_DELAY, 0),
  };

  // Validate configuration
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port number: ${config.port}`);
  }

  if (config.maxNearbyStopsRadius > 50000) {
    throw new Error(`Max nearby stops radius too large: ${config.maxNearbyStopsRadius}m (max: 50000m)`);
  }

  if (config.rateLimitMaxRequests < 1) {
    throw new Error(`Invalid rate limit max requests: ${config.rateLimitMaxRequests}`);
  }

  return config;
};

// Export the loaded configuration
export const env = loadEnvironmentConfig();

// Export environment utilities
export const isProduction = (): boolean => env.nodeEnv === 'production';
export const isDevelopment = (): boolean => env.nodeEnv === 'development';
export const isTest = (): boolean => env.nodeEnv === 'test';

// Log configuration on startup (excluding sensitive data)
export const logConfigSummary = (): void => {
  const summary = {
    environment: env.nodeEnv,
    port: env.port,
    debug: env.debug,
    rateLimitingEnabled: env.rateLimitingEnabled,
    cacheEnabled: env.cacheEnabled,
    enableVehicleTracking: env.enableVehicleTracking,
    enableServiceAlerts: env.enableServiceAlerts,
    enableNearbyStops: env.enableNearbyStops,
    gtfsRealtimeUrl: env.gtfsRealtimeUrl.replace(/\?.+/, '...'), // Hide query params
    gtfsStaticUrl: env.gtfsStaticUrl.replace(/\?.+/, '...'),
  };

  console.log('📋 Configuration Summary:');
  console.table(summary);
};
