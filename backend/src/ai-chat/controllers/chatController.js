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
    const { message } = req.body;
    const userId = req.auth.sub; // From auth middleware
    const email = req.auth.email;

    // Validation
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

    // Generate AI response
    const aiResponse = await groqService.generateResponse(
      trimmedMessage,
      userId
    );

    if (!aiResponse) {
      throw new AIServiceError("Failed to generate AI response");
    }

    // Store message in database for history/analytics (non-blocking)
    _storeChatMessage(userId, email, trimmedMessage, aiResponse).catch(
      (err) => {
        console.error("Error storing chat message:", err);
        // Don't fail the request if storage fails
      }
    );

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
 * POST /api/ai-chat/clear-history
 * Clear conversation history for the user
 */
export async function clearChatHistory(req, res, next) {
  try {
    const userId = req.auth.sub;

    groqService.clearHistory(userId);

    // Also clear from database if storing history
    const db = await getDb();
    await db
      .collection("chatHistory")
      .deleteMany({ userId });

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

    // Reverse to get chronological order
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
 * Health check for AI Chat service
 */
export async function healthCheck(req, res) {
  try {
    await groqService.validateApiKey();
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

/**
 * Store chat message in database for history
 * @private
 */
async function _storeChatMessage(userId, email, userMessage, aiResponse) {
  try {
    const db = await getDb();
    const now = new Date();

    // Store user message
    await db.collection("chatHistory").insertOne({
      userId,
      email,
      role: "user",
      content: userMessage,
      createdAt: now,
    });

    // Store AI response
    await db.collection("chatHistory").insertOne({
      userId,
      email,
      role: "assistant",
      content: aiResponse,
      createdAt: new Date(),
    });
  } catch (error) {
    throw error;
  }
}

export default {
  sendMessage,
  clearChatHistory,
  getChatHistory,
  healthCheck,
};
