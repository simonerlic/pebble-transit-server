import { Request, Response } from "express";
import { ApiResponse, PaginatedResponse } from "../types/gtfs";

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
  };
}

export function createErrorResponse(
  error: string,
  errorDetails?: string,
): ApiResponse<never> {
  return {
    success: false,
    timestamp: new Date().toISOString(),
    error,
    errorDetails,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  const hasNext = page * limit < total;
  const hasPrev = page > 1;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    data,
    pagination: {
      page,
      limit,
      total,
      hasNext,
      hasPrev,
    },
  };
}

export function handleAsync(
  fn: (req: Request, res: Response) => Promise<void | any>,
) {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((error) => {
      console.error("Async handler error:", error);
      if (!res.headersSent) {
        res
          .status(500)
          .json(
            createErrorResponse(
              "Internal server error",
              error instanceof Error ? error.message : "Unknown error",
            ),
          );
      }
    });
  };
}

export function validateLatLon(
  lat: string | undefined,
  lon: string | undefined,
): { lat: number; lon: number } | null {
  if (!lat || !lon) {
    return null;
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { lat: latitude, lon: longitude };
}

export function validatePositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

export function validatePositiveNumber(
  value: string | undefined,
  defaultValue: number,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}
