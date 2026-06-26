/**
 * Deprecated Gemini service shim
 *
 * The project has migrated to Groq as the primary AI provider. This shim remains
 * to prevent accidental imports of the old implementation. Any runtime call
 * into this module will throw a clear error directing developers to use the
 * new `groqService` in `services/groqService.js`.
 */

export function _deprecatedGemini() {
  throw new Error(
    "Gemini integration has been removed. Use the groqService (GROQ_API_KEY) instead."
  );
}

export const geminiService = {
  generateResponse: () => _deprecatedGemini(),
  validateApiKey: () => _deprecatedGemini(),
  clearHistory: () => _deprecatedGemini(),
  getHistory: () => _deprecatedGemini(),
};

export default geminiService;
