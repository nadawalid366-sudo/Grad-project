/**
 * AI Chat Middleware
 * Request validation and sanitization for AI Chat endpoints
 */

import { ValidationError } from "../utils/errors.js";

/**
 * Validate message payload
 */
export function validateMessagePayload(req, res, next) {
  try {
    const { message } = req.body;

    if (typeof message !== "string") {
      throw new ValidationError("Message must be a string");
    }

    // Sanitize message
    const sanitized = message.trim();

    if (sanitized.length === 0) {
      throw new ValidationError("Message cannot be empty");
    }

    if (sanitized.length > 5000) {
      throw new ValidationError("Message exceeds maximum length of 5000 characters");
    }

    // Store sanitized message back
    req.body.message = sanitized;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Rate limiting middleware for AI Chat
 * Simple in-memory rate limiter (use Redis for production at scale)
 */
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  middleware() {
    return (req, res, next) => {
const userId = req.auth?.id || req.auth?.sub;
      if (!userId) {
        return next();
      }

      const now = Date.now();
      const userRequests = this.requests.get(userId) || [];

      // Remove old requests outside the window
      const recentRequests = userRequests.filter((time) => now - time < this.windowMs);

      if (recentRequests.length >= this.maxRequests) {
        const error = new Error("Too many requests to AI Chat. Please wait before sending another message.");
        error.statusCode = 429;
        error.errorCode = "RATE_LIMIT_EXCEEDED";
        return next(error);
      }

      recentRequests.push(now);
      this.requests.set(userId, recentRequests);

      next();
    };
  }
}

export const rateLimiter = new RateLimiter(60000, 30); // 30 messages per minute

/**
 * Error handling middleware for AI Chat
 */
export function handleAIChatError(err, req, res, next) {
  console.error("AI Chat Error:", {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode || 500,
    errorCode: err.errorCode || "UNKNOWN_ERROR",
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || "UNKNOWN_ERROR";

  return res.status(statusCode).json({
    success: false,
    error: err.message || "An error occurred",
    errorCode,
    timestamp: new Date().toISOString(),
  });
}

export default {
  validateMessagePayload,
  rateLimiter,
  handleAIChatError,
};
