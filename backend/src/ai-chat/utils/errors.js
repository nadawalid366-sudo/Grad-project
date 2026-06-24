/**
 * Custom error classes for AI Chat module
 */

export class AIError extends Error {
  constructor(message, statusCode = 500, errorCode = "AI_ERROR") {
    super(message);
    this.name = "AIError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class ValidationError extends AIError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AIError {
  constructor(message) {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AIError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class RateLimitError extends AIError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

export class AIServiceError extends AIError {
  constructor(message) {
    super(message, 502, "AI_SERVICE_ERROR");
    this.name = "AIServiceError";
  }
}
