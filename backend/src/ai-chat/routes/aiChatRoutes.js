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

// All AI Chat routes require authentication
router.use(requireAuth);

/**
 * POST /api/ai-chat/message
 * Send a message to the AI and get a response (with optional healthContext in body)
 */
router.post(
  "/message",
  rateLimiter.middleware(),
  validateMessagePayload,
  chatController.sendMessage
);

/**
 * POST /api/ai-chat/classify-voice
 * Classify a voice transcript into a health log category using AI
 * Body: { transcript: string }
 */
router.post("/classify-voice", chatController.classifyVoiceInput);

/**
 * POST /api/ai-chat/daily-insight
 * Fetch Aura's proactive daily insight based on current health context
 */
router.post("/daily-insight", chatController.getDailyInsight);

/**
 * GET /api/ai-chat/health
 */
router.get("/health", chatController.healthCheck);

/**
 * GET /api/ai-chat/history
 */
router.get("/history", chatController.getChatHistory);

/**
 * DELETE /api/ai-chat/history
 */
router.delete("/history", chatController.clearChatHistory);

// Error handling middleware
router.use(handleAIChatError);

export default router;
