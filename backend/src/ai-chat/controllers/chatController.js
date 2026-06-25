/**
 * AI Chat Controller
 * Handles chat message processing and AI interactions
 */

import { groqService } from "../services/groqService.js";
import { AIServiceError, ValidationError } from "../utils/errors.js";
import { getDb } from "../../db/mongoClient.js";

/**
 * POST /api/ai-chat/message
 * Send a message and get AI response
 */
export async function sendMessage(req, res, next) {
  try {
    const { message, healthContext } = req.body;
    const userId = req.auth.sub;
    const email = req.auth.email;

    if (!message || typeof message !== "string") {
      throw new ValidationError("Message must be a non-empty string");
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      throw new ValidationError("Message cannot be empty or whitespace only");
    }
    if (trimmedMessage.length > 5000) {
      throw new ValidationError("Message cannot exceed 5000 characters");
    }

    // Generate AI response with optional health context
    const aiResponse = await groqService.generateResponse(
      trimmedMessage,
      userId,
      healthContext || null
    );

    if (!aiResponse) {
      throw new AIServiceError("Failed to generate AI response");
    }

    // Store message in database for history/analytics (non-blocking)
    _storeChatMessage(userId, email, trimmedMessage, aiResponse).catch((err) => {
      console.error("Error storing chat message:", err);
    });

    return res.status(200).json({
      success: true,
      reply: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai-chat/classify-voice
 * Classify a voice transcript into a health log category using AI
 * Body: { transcript: string }
 * Returns: { type, value, confidence }
 */
export async function classifyVoiceInput(req, res, next) {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ success: false, error: "transcript is required" });
    }

    const result = await groqService.classifyVoiceInput(transcript.trim());

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/ai-chat/daily-insight
 * Generate a proactive daily insight from Aura
 */
export async function getDailyInsight(req, res, next) {
  try {
    const { healthContext } = req.body;
    const insight = await groqService.generateDailyInsight(healthContext || null);
    return res.status(200).json({ success: true, insight });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/ai-chat/history
 * Clear conversation history for the user
 */
export async function clearChatHistory(req, res, next) {
  try {
    const userId = req.auth.sub;

    groqService.clearHistory(userId);

    const db = await getDb();
    await db.collection("chatHistory").deleteMany({ userId });

    return res.status(200).json({
      success: true,
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai-chat/history
 * Get conversation history for the user
 */
export async function getChatHistory(req, res, next) {
  try {
    const userId = req.auth.sub;
    const limit = parseInt(req.query.limit) || 50;

    const db = await getDb();
    const history = await db
      .collection("chatHistory")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    history.reverse();

    return res.status(200).json({
      success: true,
      history: history.map((msg) => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
      })),
      total: history.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai-chat/health
 */
export async function healthCheck(req, res) {
  try {
    groqService.validateApiKey();
    return res.status(200).json({
      success: true,
      service: "AI Chat",
      status: "operational",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      service: "AI Chat",
      status: "unavailable",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

async function _storeChatMessage(userId, email, userMessage, aiResponse) {
  const db = await getDb();
  const now = new Date();
  await db.collection("chatHistory").insertOne({
    userId, email, role: "user", content: userMessage, createdAt: now,
  });
  await db.collection("chatHistory").insertOne({
    userId, email, role: "assistant", content: aiResponse, createdAt: new Date(),
  });
}

export default {
  sendMessage,
  clearChatHistory,
  getChatHistory,
  healthCheck,
  classifyVoiceInput,
  getDailyInsight,
};
