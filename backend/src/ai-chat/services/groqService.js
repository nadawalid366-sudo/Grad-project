import fetch from "node-fetch";

const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
    this.timeout = 30000; // 30 seconds
    this.conversationHistory = new Map(); // userId -> conversation history
    this.maxHistoryLength = 20; // Keep last 20 messages per user
  }

  async initialize() {
    const key = process.env.GROQ_API_KEY || this.apiKey;
    if (!key) {
      throw new Error(
        "GROQ_API_KEY is not set in environment variables. Please set it before starting the server."
      );
    }
    this.apiKey = key;
    console.log("✓ Groq Service initialized successfully");
  }

  validateApiKey() {
    const key = process.env.GROQ_API_KEY || this.apiKey;
    if (!key) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    this.apiKey = key;
  }

  async generateResponse(message, userId) {
    this.validateApiKey();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    const cleanMessage = message.trim();

    const requestBody = {
      model: GROQ_MODEL,
      messages: [
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: cleanMessage },
      ],
    };

    try {
      const response = await this._makeRequest(requestBody);

      // Debug: log raw Groq response and request body to diagnose parsing/fallback.
      try {
        console.log("[groqService] requestBody:", JSON.stringify(requestBody));
        console.log("[groqService] raw response:", JSON.stringify(response));
      } catch (logErr) {
        // ignore logging errors
      }

      const aiText =
        response?.data?.choices?.[0]?.message?.content?.trim() ||
        response?.choices?.[0]?.message?.content?.trim() ||
        response?.choices?.[0]?.text?.trim() ||
        response?.text?.trim() ||
        "I couldn't process your request. Please try again.";

      history.push({ role: "user", content: cleanMessage });
      history.push({ role: "assistant", content: aiText });

      if (history.length > this.maxHistoryLength) {
        history.splice(0, history.length - this.maxHistoryLength);
      }

      return aiText;
    } catch (error) {
      console.error("Error generating Groq response:", error);
      throw error;
    }
  }

  async _makeRequest(requestBody, attempt = 1) {
    try {
      const key = process.env.GROQ_API_KEY || this.apiKey;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(GROQ_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new Error("Unauthorized with Groq API. Check your GROQ_API_KEY.");
      }

      if (response.status === 403) {
        throw new Error("Forbidden by Groq API. Your key may not have access.");
      }

      if (response.status === 429) {
        if (attempt < this.maxRetries) {
          const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(
            `Rate limited. Retrying after ${waitTime}ms (attempt ${attempt}/${this.maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this._makeRequest(requestBody, attempt + 1);
        }
        throw new Error("Rate limited by Groq API. Please try again later.");
      }

      if (!response.ok) {
        let errorBody = {};
        try {
          errorBody = await response.json();
        } catch {
          // ignore malformed error body
        }

        const message =
          errorBody.error?.message ||
          errorBody.message ||
          `Groq API error (${response.status})`;
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request to Groq API timed out");
      }

      if (attempt < this.maxRetries && this._isRetryable(error)) {
        const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(
          `Retrying request (attempt ${attempt}/${this.maxRetries}) after ${waitTime}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this._makeRequest(requestBody, attempt + 1);
      }

      throw error;
    }
  }

  _isRetryable(error) {
    const message = error?.message || "";
    return (
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND") ||
      message.includes("timeout") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    );
  }

  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }

  getHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }
}

export const groqService = new GroqService();
export default GroqService;
