# AI Chat Module - Implementation Checklist & Code Snippets

## ⚠️ Required Modifications to Existing Files

This document provides exact code snippets for the **only** two places where you need to modify existing files.

---

## Modification #1: Backend Routes Registration

### File: `backend/src/app.js`

#### Step 1: Add Import (Line ~8)

**BEFORE:**
```javascript
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";
import userRoutes from "./routes/userRoutes.js";
```

**AFTER:**
```javascript
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiChatRoutes from "./ai-chat/routes/aiChatRoutes.js";  // ADD THIS LINE
```

#### Step 2: Register Route (Around Line ~45, before 404 handler)

**BEFORE:**
```javascript
// Public: auth + browsing professionals. Everything else requires a valid token.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/professionals", professionalRoutes);
app.use("/api/v1/dashboard", requireAuth, dashboardRoutes);
app.use("/api/v1/users", requireAuth, userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});
```

**AFTER:**
```javascript
// Public: auth + browsing professionals. Everything else requires a valid token.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/professionals", professionalRoutes);
app.use("/api/v1/dashboard", requireAuth, dashboardRoutes);
app.use("/api/v1/users", requireAuth, userRoutes);

// AI Chat endpoints (requires authentication)
app.use("/api/ai-chat", aiChatRoutes);  // ADD THESE TWO LINES

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});
```

---

## Modification #2: Frontend API Initialization

### File: `app/_layout.tsx`

#### Step 1: Add Import (Line ~1-10)

**BEFORE:**
```typescript
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { setUnauthorizedHandler } from '../services/api';
import { getUser, initAuth } from '../services/auth';
```

**AFTER:**
```typescript
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { setUnauthorizedHandler } from '../services/api';
import { initializeAIChatAPI } from '../services/aiChatService';  // ADD THIS LINE
import { getUser, initAuth } from '../services/auth';
```

#### Step 2: Initialize AI Chat API (In useEffect)

Find the `RootLayout` component and the `useEffect` hook that initializes auth. Add the AI Chat initialization:

**BEFORE:**
```typescript
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        await initAuth();
        const user = getUser();

        if (!active) {
          return;
        }

        // more code...
      } catch (e) {
        // error handling
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [router]);
```

**AFTER:**
```typescript
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        await initAuth();
        const user = getUser();

        if (!active) {
          return;
        }

        // Initialize AI Chat API
        const apiBaseUrl = resolveApiBaseUrl();  // Use existing function
        initializeAIChatAPI(apiBaseUrl);
        
        // more code...
      } catch (e) {
        // error handling
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [router]);
```

**Note:** `resolveApiBaseUrl()` function already exists in the file. If it doesn't exist, use the `apiBaseUrl` from your API service initialization.

---

## Modification #3 (Optional): Add to Navigation

### File: `app/(tabs)/_layout.tsx`

#### Add Tab Screen for AI Chat

**LOCATION:** After the existing tab screens, before the closing `</Tabs>`

**ADD:**
```typescript
{/* AI Chat Tab */}
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

**Example (Full Context):**
```typescript
{/* Existing tabs... */}

{/* Messages Tab - already exists */}
<Tabs.Screen
  name="messages"
  options={{
    title: "Messages",
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="message.fill" color={color} />
    ),
  }}
/>

{/* AI Chat Tab - ADD THIS */}
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

---

## Dependencies Installation

### Backend

```bash
cd backend

# Install node-fetch for Gemini API calls
npm install node-fetch

# Verify it's added to package.json
npm list node-fetch
```

Your `backend/package.json` should now include:
```json
{
  "dependencies": {
    ...existing packages...,
    "node-fetch": "^2.7.0"
  }
}
```

### Frontend

No new dependencies needed - all are already included.

---

## Environment Variables Setup

### Backend Configuration

Create or update `backend/.env`:

```bash
# Gemini API Configuration
GEMINI_API_KEY=your-actual-gemini-api-key-here

# CORS Configuration (your app's domains)
ALLOWED_ORIGIN=http://localhost:8081,http://localhost:19000,http://192.168.x.x:19000
```

### Frontend Configuration (Optional)

Add to `app.json` under `"expo": { "extra": {} }`:

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

Or set as environment variables before running:
```bash
export EXPO_PUBLIC_STT_URL=http://192.168.x.x:5002
export EXPO_PUBLIC_API_URL=http://192.168.x.x:5001
export EXPO_PUBLIC_API_PORT=5001
```

---

## Verification Checklist

After making all changes, verify:

### Backend
- [ ] `backend/src/app.js` has `import aiChatRoutes`
- [ ] `backend/src/app.js` has `app.use("/api/ai-chat", aiChatRoutes)`
- [ ] `backend/.env` has `GEMINI_API_KEY` set
- [ ] `backend/package.json` includes `node-fetch`
- [ ] `backend/src/ai-chat/` folder exists with all 5 files

### Frontend
- [ ] `app/_layout.tsx` has `import { initializeAIChatAPI }`
- [ ] `app/_layout.tsx` calls `initializeAIChatAPI(apiBaseUrl)`
- [ ] `app/ai-chat.tsx` file exists
- [ ] `components/chat/` folder exists with 5 components
- [ ] `hooks/use-chat.ts` and `hooks/use-voice-chat.ts` exist
- [ ] `services/aiChatService.ts` exists

### Database
- [ ] MongoDB is running
- [ ] `chatHistory` collection will be created on first message

### Services
- [ ] STT Service running on port 5002
- [ ] Backend running on port 5001
- [ ] Frontend can start without errors

---

## Testing After Setup

### 1. Test Backend Health

```bash
# Get your auth token first, then:
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5001/api/ai-chat/health
```

Expected response:
```json
{
  "success": true,
  "service": "AI Chat",
  "status": "operational",
  "timestamp": "2026-06-24T10:30:00Z"
}
```

### 2. Test Chat Message

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me?"}' \
  http://localhost:5001/api/ai-chat/message
```

Expected response:
```json
{
  "success": true,
  "reply": "Hello! I'm here to help. What can I do for you?",
  "timestamp": "2026-06-24T10:30:05Z"
}
```

### 3. Test in App

1. Start all services
2. Login to app
3. Navigate to "AI Chat" tab
4. Send a message
5. Verify AI response appears
6. Try voice recording (if STT service is running)

---

## Rollback Instructions

If you need to undo these changes:

### Backend Rollback

In `backend/src/app.js`:
1. Remove the import: `import aiChatRoutes from "./ai-chat/routes/aiChatRoutes.js";`
2. Remove the route: `app.use("/api/ai-chat", aiChatRoutes);`
3. Run `npm uninstall node-fetch`

### Frontend Rollback

In `app/_layout.tsx`:
1. Remove the import: `import { initializeAIChatAPI } from '../services/aiChatService';`
2. Remove the initialization: `initializeAIChatAPI(apiBaseUrl);`

In `app/(tabs)/_layout.tsx`:
1. Remove the AI Chat tab screen block

### Note: 
The new files can be deleted without affecting existing functionality since they're completely isolated.

---

## Support Contacts

For issues:
1. Check `AI_CHAT_INTEGRATION_GUIDE.md` troubleshooting section
2. Check `AI_CHAT_QUICK_START.md` for 5-min setup
3. Review server logs in terminal
4. Check API responses with cURL

---

**Document Version**: 1.0.0
**Last Updated**: 2026-06-24
**Status**: Ready for Implementation ✓
