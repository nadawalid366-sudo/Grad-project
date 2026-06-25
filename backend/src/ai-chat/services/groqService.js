import fetch from "node-fetch";

const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Valid Groq model

const HEALTH_SYSTEM_PROMPT = `You are Aura, an intelligent, friendly, and proactive personal health companion embedded in the VitalConnect app. You are not just a chatbot; you are a dedicated partner in the patient's wellness journey.

Your capabilities:
- Analyze health metrics (calories, sleep, water intake, medication adherence)
- Interpret recent activity logs (meals, exercise, vitals, symptoms, medications)
- Provide evidence-based health advice, actionable insights, and warm encouragement
- Alert the user if their data suggests concern (e.g., very low sleep, missed medications)
- Answer general health questions clearly and concisely

Guidelines:
- Introduce yourself as Aura when appropriate. Speak with a warm, empathetic, and uplifting tone.
- Be proactive but never judgmental or preachy.
- Always remind users to consult their doctor for medical decisions.
- Use the user's actual health data (provided in context) to personalize every response.
- Keep responses concise, scannable, and complete — use bullet points when listing items.
- If you don't have enough data to answer, say so honestly and warmly.`;

function buildSystemPrompt(healthContext) {
  if (!healthContext) return HEALTH_SYSTEM_PROMPT;

  const lines = [HEALTH_SYSTEM_PROMPT, "\n## Current User Health Data\n"];

  if (healthContext.userName) {
    lines.push(`**Patient:** ${healthContext.userName}`);
  }

  if (healthContext.calories) {
    lines.push(
      `**Today's Calories:** ${healthContext.calories.current} / ${healthContext.calories.goal} kcal`
    );
  }

  if (healthContext.sleep) {
    lines.push(
      `**Sleep Schedule:** ${healthContext.sleep.bedtime} → ${healthContext.sleep.wakeTime}`
    );
  }

  if (healthContext.water) {
    lines.push(
      `**Water Intake:** ${healthContext.water.amount} / ${healthContext.water.goal} ${healthContext.water.unit}`
    );
  }

  if (healthContext.medication) {
    lines.push(
      `**Medication:** ${healthContext.medication.taken} / ${healthContext.medication.goal} doses taken today`
    );
  }

  if (healthContext.recentLogs && healthContext.recentLogs.length > 0) {
    lines.push(`**Recent Activity Logs:**`);
    healthContext.recentLogs.slice(0, 5).forEach((log) => {
      lines.push(`  - ${log.title || log.type} (${log.timeAgo || "recently"})`);
    });
  }

  return lines.join("\n");
}

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
    this.conversationHistory = new Map();
    this.maxHistoryLength = 20;
  }

  async initialize() {
    const key = process.env.GROQ_API_KEY || this.apiKey;
    if (!key) {
      throw new Error(
        "GROQ_API_KEY is not set in environment variables. Please set it before starting the server."
      );
    }
    this.apiKey = key;
    console.log("✓ Groq Service initialized successfully (model: " + GROQ_MODEL + ")");
  }

  validateApiKey() {
    const key = process.env.GROQ_API_KEY || this.apiKey;
    if (!key) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    this.apiKey = key;
  }

  async generateResponse(message, userId, healthContext) {
    this.validateApiKey();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    const cleanMessage = message.trim();
    const systemPrompt = buildSystemPrompt(healthContext);

    const requestBody = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: cleanMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    try {
      const response = await this._makeRequest(requestBody);

      const aiText =
        response?.choices?.[0]?.message?.content?.trim() ||
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

  async generateDailyInsight(healthContext) {
    this.validateApiKey();

    const systemPrompt = buildSystemPrompt(healthContext);
    const prompt = `Based on the provided health data, generate a single, short, proactive insight or word of encouragement as "Aura" (the user's health companion). Keep it strictly to 1 or 2 sentences. Make it feel personalized, warm, and actionable. Do not use quotes or introductory text.`;

    const requestBody = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    };

    try {
      const response = await this._makeRequest(requestBody);
      return response?.choices?.[0]?.message?.content?.trim() || "I'm here to help you stay on track today!";
    } catch (error) {
      console.error("Error generating daily insight:", error);
      return "I'm here to help you stay on track today!";
    }
  }

  /**
   * Parse voice input into a detailed health log using AI.
   * Extracts category, title, and detailed metrics (calories, amount, taken, hours, etc.)
   */
  async classifyVoiceInput(transcript) {
    this.validateApiKey();

    const prompt = `You are an expert health data extraction assistant. Parse the following voice transcript into a structured health log JSON object.

If the transcript is a meal, you MUST estimate the calories and macros (protein, carbs, fat in grams).
If water, extract the amount in glasses (default 1 if unspecified).
If sleep, extract hours.
If medication, extract how many taken.
If vitals, extract the relevant measurement (e.g., heartRate, bloodPressure).

Categories: meal, exercise, vitals, medication, sleep, water, mind, habit, symptom.

Transcript: "${transcript}"

Respond with ONLY valid JSON in this exact format (do not wrap in markdown or backticks):
{
  "type": "meal",
  "title": "3 Eggs",
  "details": {
    "calories": 210,
    "protein": 18,
    "carbs": 1,
    "fat": 15
  }
}`;

    const requestBody = {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    };

    try {
      const response = await this._makeRequest(requestBody);
      const raw = response?.choices?.[0]?.message?.content?.trim() || "{}";
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      return {
        type: parsed.type || "symptom",
        title: parsed.title || transcript,
        details: parsed.details || {},
      };
    } catch (error) {
      console.error("Error classifying voice input:", error);
      return { type: "symptom", title: transcript, details: {} };
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
          console.warn(`Rate limited. Retrying after ${waitTime}ms (attempt ${attempt}/${this.maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this._makeRequest(requestBody, attempt + 1);
        }
        throw new Error("Rate limited by Groq API. Please try again later.");
      }
      if (!response.ok) {
        let errorBody = {};
        try { errorBody = await response.json(); } catch { }
        const message = errorBody.error?.message || errorBody.message || `Groq API error (${response.status})`;
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request to Groq API timed out");
      }
      if (attempt < this.maxRetries && this._isRetryable(error)) {
        const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Retrying request (attempt ${attempt}/${this.maxRetries}) after ${waitTime}ms`);
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

  clearHistory(userId) { this.conversationHistory.delete(userId); }
  getHistory(userId) { return this.conversationHistory.get(userId) || []; }
}

export const groqService = new GroqService();
export default GroqService;
