# AI Chat Module Integration Guide

## Overview
This document provides step-by-step instructions to integrate the new AI Chat module into your existing application. The module is completely independent and doesn't modify any existing files.

## File Structure Created

```
PROJECT_ROOT/
├── app/
│   └── ai-chat.tsx                    # Main AI Chat Screen (NEW)
├── components/
│   └── chat/                          # Chat components (NEW)
│       ├── ChatBubble.tsx
│       ├── ChatHeader.tsx
│       ├── ChatInputBox.tsx
│       ├── RecordButton.tsx
│       └── TypingIndicator.tsx
├── hooks/
│   ├── use-chat.ts                    # Chat state management (NEW)
│   └── use-voice-chat.ts              # Voice recording integration (NEW)
├── services/
│   └── aiChatService.ts               # AI Chat API service (NEW)
└── backend/
    └── src/
        └── ai-chat/                   # AI Chat backend module (NEW)
            ├── controllers/
            │   └── chatController.js
            ├── middleware/
            │   └── validateMessage.js
            ├── routes/
            │   └── aiChatRoutes.js
            ├── services/
            │   └── geminiService.js
            └── utils/
                └── errors.js
```

## Step 1: Environment Setup

### 1.1 Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key" → "Create API key in existing project" or create a new project
3. Copy your API key

### 1.2 Backend Environment Variables
Create or update `.env` file in the `backend/` directory:

```bash
# .env
GEMINI_API_KEY=your-gemini-api-key-here
ALLOWED_ORIGIN=http://localhost:8081,http://localhost:19000,http://192.168.x.x:19000
```

Replace:
- `your-gemini-api-key-here` with your actual Gemini API key
- `192.168.x.x` with your development machine's local IP address

### 1.3 Frontend Environment Variables
Create or update `app.json` or `.env.local`:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_STT_URL": "http://192.168.x.x:5002",
      "EXPO_PUBLIC_API_URL": "http://192.168.x.x:5001"
    }
  }
}
```

Or use environment variables in your terminal:

```bash
export EXPO_PUBLIC_STT_URL=http://192.168.x.x:5002
export EXPO_PUBLIC_API_URL=http://192.168.x.x:5001
export EXPO_PUBLIC_API_PORT=5001
```

## Step 2: Backend Integration

### 2.1 Register AI Chat Routes in Backend

Open `backend/src/app.js` and add the following import at the top with other imports:

```javascript
import aiChatRoutes from "./ai-chat/routes/aiChatRoutes.js";
```

Then add this route registration **BEFORE** the error handling middleware:

```javascript
// AI Chat endpoints (requires authentication)
app.use("/api/ai-chat", aiChatRoutes);
```

### Complete Backend Routes Section (after changes)

Your routes section in `app.js` should look like this:

```javascript
// Public: auth + browsing professionals. Everything else requires a valid token.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/professionals", professionalRoutes);

// AI Chat endpoints (requires authentication)
app.use("/api/ai-chat", aiChatRoutes);

// Protected routes
app.use("/api/v1/dashboard", requireAuth, dashboardRoutes);
app.use("/api/v1/users", requireAuth, userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});
```

### 2.2 Install Additional Dependencies (Backend)

The backend needs `node-fetch` for making HTTP requests to Gemini API. Navigate to `backend/` and run:

```bash
cd backend
npm install node-fetch
```

Then install packages in the root if not already done:

```bash
cd ..
npm install
```

## Step 3: Frontend Integration

### 3.1 Initialize AI Chat API

Open `app/_layout.tsx` and add initialization for the AI Chat service. Find where the app initializes auth and add:

```typescript
import { initializeAIChatAPI } from '../services/aiChatService';

// Inside your app initialization (after resolving API base URL):
useEffect(() => {
  const initializeApp = async () => {
    // ... existing auth initialization ...
    
    // Initialize AI Chat API
    const apiBaseUrl = resolveApiBaseUrl(); // Use existing function
    initializeAIChatAPI(apiBaseUrl);
  };
  
  if (active) {
    initializeApp();
  }
}, [router]);
```

### 3.2 Add Navigation to AI Chat

You have two options:

#### Option A: Add to Tab Navigation (Recommended)

Open `app/(tabs)/_layout.tsx` and add this screen after other tab screens:

```typescript
<Tabs.Screen
  name="ai-chat"
  options={{
    title: "AI Chat",
    href: "/ai-chat",
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="sparkles.fill" color={color} />
    ),
  }}
/>
```

**Note:** The actual `ai-chat.tsx` file should be placed at `app/ai-chat.tsx` (already done) for Expo Router to auto-discover it.

#### Option B: Add as Modal/Stack Screen

Open `app/_layout.tsx` and add before the Tabs:

```typescript
<Stack.Screen 
  name="ai-chat" 
  options={{
    presentation: 'modal',
    headerShown: false,
  }} 
/>
```

### 3.3 Install Frontend Dependencies

```bash
npm install
```

Verify these packages are installed (they should be):
- `expo-audio` (already in package.json)
- `expo-file-system` (already in package.json)
- `expo-secure-store` (already in package.json)

## Step 4: Backend Route Reference

### Available Endpoints

All endpoints require authentication (Authorization header with JWT token).

#### 1. Send Message
```
POST /api/ai-chat/message
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "message": "Hello, how can you help me?"
}

Response:
{
  "success": true,
  "reply": "Hello! I'm here to help. How can I assist you today?",
  "timestamp": "2026-06-24T10:30:00Z"
}
```

#### 2. Get Chat History
```
GET /api/ai-chat/history?limit=50
Authorization: Bearer <token>

Response:
{
  "success": true,
  "history": [
    {
      "id": "507f1f77bcf86cd799439011",
      "role": "user",
      "content": "Hello",
      "timestamp": "2026-06-24T10:25:00Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "role": "assistant",
      "content": "Hello! How can I help you?",
      "timestamp": "2026-06-24T10:25:05Z"
    }
  ],
  "total": 2
}
```

#### 3. Clear History
```
DELETE /api/ai-chat/history
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Chat history cleared successfully"
}
```

#### 4. Health Check
```
GET /api/ai-chat/health
Authorization: Bearer <token>

Response:
{
  "success": true,
  "service": "AI Chat",
  "status": "operational",
  "timestamp": "2026-06-24T10:30:00Z"
}
```

## Step 5: Startup Commands

### Start the Backend

```bash
# From project root
cd backend
npm run dev    # Development mode with hot reload
# or
npm start      # Production mode
```

The backend will run on `http://localhost:5001`

### Start the STT Service

```bash
# From project root
cd stt-service
.\venv\Scripts\activate    # Activate virtual environment
python app/main.py         # or use start.bat
```

The STT service will run on `http://localhost:5002`

### Start the Frontend

```bash
# From project root (in a new terminal)
npm start
```

Or use the dev command to start both:

```bash
npm run dev
```

## Step 6: Testing the Integration

### Test Checklist

1. **Backend Health Check**
   ```bash
   curl -H "Authorization: Bearer <your-token>" \
        http://localhost:5001/api/ai-chat/health
   ```

2. **Send a Test Message**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer <your-token>" \
        -H "Content-Type: application/json" \
        -d '{"message": "Hello"}' \
        http://localhost:5001/api/ai-chat/message
   ```

3. **Frontend Tests**
   - Log in to the app
   - Navigate to AI Chat (from tabs or via ai-chat route)
   - Send a text message and verify response
   - Record a voice message and verify transcription
   - Test clear history functionality

### Troubleshooting

**Issue: "GEMINI_API_KEY is not set"**
- Verify `.env` file exists in `backend/` directory
- Restart backend server after adding API key

**Issue: "Cannot connect to STT service"**
- Verify STT service is running on port 5002
- Check the URL matches your machine's IP address
- Verify `EXPO_PUBLIC_STT_URL` environment variable is set correctly

**Issue: "Unauthorized error" in frontend**
- Verify you're logged in
- Check JWT token is being stored correctly
- Verify `Authorization` header is being sent

**Issue: "Cannot find module 'node-fetch'"**
- Run `npm install node-fetch` in `backend/` directory
- Restart the backend server

## Step 7: Customization

### Change AI Assistant Name
Edit `components/chat/ChatHeader.tsx`:
```typescript
<Text style={[styles.name, { color: '#ffffff' }]}>
  Your Custom AI Name
</Text>
```

### Change Max Message Length
Edit `services/aiChatService.ts`:
```typescript
body: JSON.stringify({ message }) // Add validation
```

Edit `backend/src/ai-chat/middleware/validateMessage.js`:
```javascript
if (trimmedMessage.length > 10000) { // Change from 5000
  throw new ValidationError("Message cannot exceed 10000 characters");
}
```

### Adjust Rate Limiting
Edit `backend/src/ai-chat/middleware/validateMessage.js`:
```javascript
const rateLimiter = new RateLimiter(60000, 60); // 60 messages per minute
```

### Change STT Service URL
Add to environment variables:
```bash
EXPO_PUBLIC_STT_URL=your-custom-stt-url
```

## Database Collections

The AI Chat module creates/uses these MongoDB collections:

- **chatHistory**: Stores all chat messages
  ```javascript
  {
    _id: ObjectId,
    userId: "user_id",
    email: "user@example.com",
    role: "user" | "assistant",
    content: "message text",
    createdAt: ISODate
  }
  ```

## Performance Considerations

1. **Message History**: Stored in-memory for active users (default 20 messages per conversation)
2. **Rate Limiting**: 30 messages per minute per user
3. **Database**: Conversations stored in MongoDB for persistence
4. **Timeout**: 30 seconds per request to Gemini API

## Security Notes

- All routes require JWT authentication
- API keys never sent to frontend
- Requests validated server-side
- Rate limiting prevents abuse
- Conversation history scoped to authenticated user

## Next Steps

1. ✅ Set up environment variables
2. ✅ Register routes in backend
3. ✅ Start backend and STT services
4. ✅ Start frontend
5. ✅ Test the AI Chat functionality
6. ✅ Deploy to production

## Support

For issues:
1. Check the troubleshooting section
2. Review server logs in terminal
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Last Updated**: 2026-06-24
**Version**: 1.0.0
