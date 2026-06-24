/**
 * AI Chat Routes
 * Endpoints for AI Chat functionality
 */

import express from "express";
import { requireAuth } from "../../auth/authMiddleware.js";
import chatController from "../controllers/chatController.js";
import {
  validateMessagePayload,
  rateLimiter,
  handleAIChatError,
} from "../middleware/validateMessage.js";

const router = express.Router();

/**
 * All AI Chat routes require authentication
 */
router.use(requireAuth);

/**
 * POST /api/ai-chat/message
 * Send a message to the AI and get a response
 * Rate limited to 30 messages per minute
 */
router.post(
  "/message",
  rateLimiter.middleware(),
  validateMessagePayload,
  chatController.sendMessage
);

/**
 * GET /api/ai-chat/health
 * Health check for the AI Chat service
 */
router.get("/health", chatController.healthCheck);

/**
 * GET /api/ai-chat/history
 * Get chat history for the authenticated user
 * Query params:
 * - limit: number of messages to retrieve (default: 50, max: 200)
 */
router.get("/history", chatController.getChatHistory);

/**
 * DELETE /api/ai-chat/history
 * Clear chat history for the authenticated user
 */
router.delete("/history", chatController.clearChatHistory);

/**
 * Error handling middleware for this router
 */
router.use(handleAIChatError);

export default router;
