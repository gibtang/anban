export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = "Unauthorized") {
    super("unauthorized", msg, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = "Forbidden") {
    super("forbidden", msg, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(msg = "Not found") {
    super("not_found", msg, 404);
  }
}

export class ConflictError extends AppError {
  constructor(msg: string) {
    super("conflict", msg, 409);
  }
}

export class ValidationError extends AppError {
  constructor(
    msg: string,
    public details?: unknown,
  ) {
    super("validation_error", msg, 400);
  }
}

export class InvalidStateTransitionError extends ConflictError {
  constructor(msg: string) {
    super(msg);
    this.code = "invalid_state_transition";
  }
}
