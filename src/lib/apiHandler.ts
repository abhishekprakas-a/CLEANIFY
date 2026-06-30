import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/lib/apiError";
import { failure } from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

/**
 * Central wrapper for Route Handlers. Runs the handler, and translates known
 * errors (ApiError, ZodError) and unexpected errors into the standard envelope.
 */
export async function handleRoute(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      // Log server-side faults; client/validation errors are expected.
      if (error.statusCode >= 500) {
        logger.error(error.message, { code: error.code });
      }
      return failure(
        error.statusCode,
        error.code,
        error.message,
        error.details,
      );
    }

    if (error instanceof ZodError) {
      return failure(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        error.flatten(),
      );
    }

    logger.error("Unhandled route error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return failure(500, "INTERNAL", "Something went wrong");
  }
}
