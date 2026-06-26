# AI Chat Module - Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Gemini API key (free from [Google AI Studio](https://aistudio.google.com/apikey))
- Running STT service on port 5002
- Running MongoDB database

### Step 1: Backend Configuration (2 min)

**1. Add Gemini API Key**

Create `backend/.env`:
```bash
GEMINI_API_KEY=your-api-key-here
ALLOWED_ORIGIN=http://localhost:8081,http://localhost:19000
```

**2. Register Routes**

In `backend/src/app.js`, add these two lines:

```javascript
// At the top with other imports:
import aiChatRoutes from "./ai-chat/routes/aiChatRoutes.js";

// Before error handlers (after other routes):
app.use("/api/ai-chat", aiChatRoutes);
```

**3. Install Dependencies**

```bash
cd backend
npm install node-fetch
npm install  # or npm update
```

### Step 2: Frontend Configuration (1 min)

**1. Initialize API Service**

In `app/_layout.tsx`, add this to your app initialization:

```typescript
import { initializeAIChatAPI } from '../services/aiChatService';

// In your useEffect:
const apiBaseUrl = resolveApiBaseUrl();
initializeAIChatAPI(apiBaseUrl);
```

**2. Add Navigation**

Option A - Add to tab navigation in `app/(tabs)/_layout.tsx`:
```typescript
<Tabs.Screen
  name="ai-chat"
  options={{
    title: "AI Chat",
    href: "/ai-chat",
    tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles.fill" color={color} />,
  }}
/>
```

Option B - Or just access via `/ai-chat` route directly.

### Step 3: Run Everything (2 min)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - STT Service
cd stt-service
python app/main.py

# Terminal 3 - Frontend
npm start
```

### Done! 🎉

Login to your app and navigate to **AI Chat** tab. Start chatting!

---

## Features

✅ WhatsApp-style UI
✅ Real-time AI responses via Gemini
✅ Voice-to-text with STT integration
✅ Chat history & conversation context
✅ Rate limiting (30 messages/min)
✅ Modern animations & smooth UX
✅ Error handling & recovery
✅ Production-ready code

---

## Quick Test

### Without Frontend (cURL)

```bash
# Get your JWT token first, then:

curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}' \
  http://localhost:5001/api/ai-chat/message
```

Response:
```json
{
  "success": true,
  "reply": "Hello! How can I help you today?",
  "timestamp": "2026-06-24T10:30:00Z"
}
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "GEMINI_API_KEY not found" | Add to `backend/.env` and restart server |
| "Cannot connect to STT" | Check STT running on 5002, verify URL in env |
| "Unauthorized" in chat | Make sure you're logged in & token is valid |
| "module not found: node-fetch" | Run `npm install node-fetch` in backend |

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai-chat/message` | Send message, get AI response |
| GET | `/api/ai-chat/history?limit=50` | Get chat history |
| DELETE | `/api/ai-chat/history` | Clear chat history |
| GET | `/api/ai-chat/health` | Service health check |

---

## File Locations

```
✅ New Backend Files:
  └─ backend/src/ai-chat/
     ├─ services/geminiService.js
     ├─ controllers/chatController.js
     ├─ routes/aiChatRoutes.js
     ├─ middleware/validateMessage.js
     └─ utils/errors.js

✅ New Frontend Files:
  ├─ app/ai-chat.tsx
  ├─ components/chat/
  │  ├─ ChatBubble.tsx
  │  ├─ ChatHeader.tsx
  │  ├─ ChatInputBox.tsx
  │  ├─ RecordButton.tsx
  │  └─ TypingIndicator.tsx
  ├─ hooks/
  │  ├─ use-chat.ts
  │  └─ use-voice-chat.ts
  └─ services/aiChatService.ts
```

---

## Performance Notes

- Conversation history kept in memory (last 20 messages per user)
- Messages stored in MongoDB for persistence
- Rate limited to 30 messages/minute per user
- 30-second timeout per Gemini API request
- Auto-scroll to newest messages
- Typing indicators while waiting for response

---

## Next Steps

1. Test with a few messages
2. Test voice recording feature
3. Review chat history functionality
4. Customize UI colors in `components/chat/*`
5. Deploy to production

See `AI_CHAT_INTEGRATION_GUIDE.md` for full details.
