import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Invalid request body",
          details: err.flatten(),
        },
      },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err instanceof ValidationError && err.details
            ? { details: err.details }
            : {}),
        },
      },
      { status: err.status },
    );
  }
  console.error("Unhandled error", err);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Internal error" } },
    { status: 500 },
  );
}

export function ok<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}
