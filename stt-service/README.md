# 🎙️ Speech Intelligence Service

> A self-hosted, local-first speech-to-text REST API powered by **OpenAI Whisper** — supports **Arabic & English** out of the box. Drop it into any mobile or web app with a single HTTP call.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Whisper](https://img.shields.io/badge/Whisper-OpenAI-412991?style=flat&logo=openai)](https://github.com/openai/whisper)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python)](https://python.org)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat&logo=expo)](https://expo.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Integrating Into Your App](#-integrating-into-your-app)
  - [React Native / Expo](#react-native--expo)
  - [Flutter](#flutter)
  - [Swift (iOS)](#swift-ios)
  - [Kotlin (Android)](#kotlin-android)
  - [JavaScript / Fetch](#javascript--fetch)
  - [Python](#python)
  - [cURL](#curl)
- [Configuration](#-configuration)
- [Authentication](#-authentication)
- [Performance & Models](#-performance--models)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

**Speech Intelligence Service** exposes a simple `POST /transcribe` endpoint that accepts an audio file and returns the transcribed text. It runs entirely on your own machine — no data is sent to any external service.

**Key features:**
- 🌍 Multilingual — auto-detects language (Arabic, English, and 90+ others)
- 🔒 Self-hosted — all processing happens locally, zero cloud dependency
- ⚡ Fast — uses Whisper `tiny` model for quick CPU inference (~5-15s per clip)
- 🔑 Optional API key protection for production use
- 📱 Ready-to-use React Native / Expo frontend included
- 📄 Interactive Swagger docs at `/docs`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your Mobile / Web App                 │
│  (React Native, Flutter, Swift, Kotlin, or any HTTP     │
│   client)                                               │
└───────────────────────┬─────────────────────────────────┘
                        │  POST /transcribe
                        │  multipart/form-data { file }
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Speech Intelligence Service                │
│                                                         │
│  FastAPI ──► File Validator ──► Whisper (local model)   │
│                                        │                │
│                               { text, language,         │
│                                 processing_time }       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+ (for the Expo frontend only)
- [FFmpeg](https://ffmpeg.org/download.html) installed and on your PATH
  ```bash
  # Windows (with Chocolatey)
  choco install ffmpeg

  # macOS
  brew install ffmpeg

  # Ubuntu / Debian
  sudo apt install ffmpeg
  ```

### 1. Clone & Install

```bash
git clone https://github.com/Marwan911e/speech-intelligence-service.git
cd speech-intelligence-service

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure

```bash
# Copy the example env file and edit it
cp .env.example .env
```

Edit `.env` — at minimum set your machine's local IP if using with mobile:

```env
WHISPER_MODEL="tiny"      # tiny | base | small | medium | large
API_KEY=""                # Leave blank for open access
```

### 3. Run

```bash
# Start the API (accessible on all network interfaces)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the included helper script to start both the API and the Expo frontend at once:

```bash
# Windows
start.bat
```

The API is now available at:
- **Local:** `http://127.0.0.1:8000`
- **Network (mobile):** `http://<your-local-ip>:8000`
- **Swagger Docs:** `http://127.0.0.1:8000/docs`

---

## 📡 API Reference

### `GET /health`
Returns `200 OK` when the service is running. Use this to verify connectivity before sending audio.

```http
GET /health
```

**Response:**
```json
{ "status": "ok" }
```

---

### `GET /`
Returns service information.

```http
GET /
```

**Response:**
```json
{
  "name": "Speech to Text API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs",
  "model": "tiny"
}
```

---

### `POST /transcribe`
Transcribes an audio file. This is the main integration endpoint.

```http
POST /transcribe
Content-Type: multipart/form-data
X-API-Key: your-key-here   (only if API_KEY is set in .env)
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ | Audio file to transcribe |

**Supported formats:** `mp3`, `wav`, `m4a`, `webm`  
**Max file size:** 50 MB (configurable)

**Success Response `200`:**
```json
{
  "success": true,
  "text": "مرحباً، كيف حالك؟",
  "language": "ar",
  "processing_time": 4.21
}
```

**Error Response `400` (invalid file):**
```json
{
  "success": false,
  "error": "Invalid file",
  "detail": "Invalid file type: txt. Allowed: ['mp3', 'wav', 'm4a', 'webm']"
}
```

**Error Response `401` (wrong API key):**
```json
{
  "detail": "Invalid or missing API key. Pass it as 'X-API-Key' header."
}
```

---

## 📱 Integrating Into Your App

> **Important:** Replace `192.168.1.101` with your machine's actual local IP address in all examples below. Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find it.

### React Native / Expo

Install axios if you haven't already:
```bash
npx expo install axios
```

```typescript
// services/SpeechService.ts
import axios from 'axios';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

const API_URL =
  Platform.OS === 'android' && !isDevice
    ? 'http://10.0.2.2:8000'      // Android emulator
    : 'http://192.168.1.101:8000'; // Physical device (your LAN IP)

export async function transcribeAudio(fileUri: string) {
  const filename = fileUri.split('/').pop() ?? 'audio.m4a';
  const ext = filename.split('.').pop() ?? 'm4a';

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: `audio/${ext}`,
  } as any);

  const { data } = await axios.post(`${API_URL}/transcribe`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });

  return data; // { success, text, language, processing_time }
}
```

**Record then transcribe:**
```typescript
import { Audio } from 'expo-av';

// 1. Request permission
await Audio.requestPermissionsAsync();

// 2. Start recording
await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);

// 3. Stop and transcribe
await recording.stopAndUnloadAsync();
const uri = recording.getURI();
const result = await transcribeAudio(uri!);
console.log(result.text); // "Hello, how are you?"
```

---

### Flutter

```dart
// pubspec.yaml — add these dependencies:
// http: ^1.2.0
// record: ^5.1.0

import 'dart:io';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> transcribeAudio(String filePath) async {
  final uri = Uri.parse('http://192.168.1.101:8000/transcribe');
  final request = http.MultipartRequest('POST', uri);

  // Add API key if required
  // request.headers['X-API-Key'] = 'your-key';

  request.files.add(await http.MultipartFile.fromPath('file', filePath));

  final streamed = await request.send();
  final response = await http.Response.fromStream(streamed);

  if (response.statusCode == 200) {
    return jsonDecode(response.body);
    // Returns: { "success": true, "text": "...", "language": "en", "processing_time": 3.5 }
  } else {
    throw Exception('Transcription failed: ${response.body}');
  }
}
```

---

### Swift (iOS)

```swift
import Foundation

func transcribeAudio(fileURL: URL, completion: @escaping (Result<String, Error>) -> Void) {
    let endpoint = URL(string: "http://192.168.1.101:8000/transcribe")!
    var request = URLRequest(url: endpoint)
    request.httpMethod = "POST"
    request.timeoutInterval = 120

    // Add API key if required
    // request.addValue("your-key", forHTTPHeaderField: "X-API-Key")

    let boundary = "Boundary-\(UUID().uuidString)"
    request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

    var body = Data()
    let filename = fileURL.lastPathComponent
    let audioData = try! Data(contentsOf: fileURL)

    body.append("--\(boundary)\r\n".data(using: .utf8)!)
    body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
    body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
    body.append(audioData)
    body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
    request.httpBody = body

    URLSession.shared.dataTask(with: request) { data, _, error in
        if let error = error { completion(.failure(error)); return }
        if let data = data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let text = json["text"] as? String {
            completion(.success(text))
        }
    }.resume()
}
```

> **iOS HTTP Note:** Add this to your `Info.plist` to allow HTTP connections to local IPs:
> ```xml
> <key>NSAppTransportSecurity</key>
> <dict>
>   <key>NSAllowsArbitraryLoads</key>
>   <true/>
> </dict>
> ```

---

### Kotlin (Android)

```kotlin
// build.gradle — add: implementation("com.squareup.okhttp3:okhttp:4.12.0")

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

fun transcribeAudio(audioFile: File, callback: (String?) -> Unit) {
    val client = OkHttpClient.Builder()
        .callTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart("file", audioFile.name,
            audioFile.asRequestBody("audio/m4a".toMediaType()))
        .build()

    val request = Request.Builder()
        .url("http://192.168.1.101:8000/transcribe")
        // .addHeader("X-API-Key", "your-key")  // uncomment if API key is set
        .post(requestBody)
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            val json = org.json.JSONObject(response.body!!.string())
            callback(json.getString("text"))
        }
        override fun onFailure(call: Call, e: IOException) {
            callback(null)
        }
    })
}
```

> **Android HTTP Note:** Add `android:usesCleartextTraffic="true"` to `<application>` in `AndroidManifest.xml`.

---

### JavaScript / Fetch

```javascript
async function transcribeAudio(audioBlob, filename = 'audio.webm') {
  const formData = new FormData();
  formData.append('file', audioBlob, filename);

  const response = await fetch('http://192.168.1.101:8000/transcribe', {
    method: 'POST',
    // headers: { 'X-API-Key': 'your-key' },  // uncomment if needed
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Transcription failed');
  }

  return await response.json();
  // { success: true, text: "...", language: "en", processing_time: 4.1 }
}

// Usage with MediaRecorder (browser)
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream);
const chunks = [];

recorder.ondataavailable = e => chunks.push(e.data);
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const result = await transcribeAudio(blob);
  console.log(result.text);
};

recorder.start();
setTimeout(() => recorder.stop(), 5000); // record for 5 seconds
```

---

### Python

```python
import httpx

def transcribe_audio(file_path: str, api_url: str = "http://127.0.0.1:8000") -> dict:
    with open(file_path, "rb") as f:
        response = httpx.post(
            f"{api_url}/transcribe",
            files={"file": (file_path.split("/")[-1], f, "audio/m4a")},
            # headers={"X-API-Key": "your-key"},  # uncomment if needed
            timeout=120.0,
        )
    response.raise_for_status()
    return response.json()
    # { "success": True, "text": "...", "language": "ar", "processing_time": 5.2 }

# Example usage
result = transcribe_audio("my_recording.m4a")
print(result["text"])
```

---

### cURL

```bash
# Basic transcription
curl -X POST http://192.168.1.101:8000/transcribe \
  -F "file=@recording.m4a"

# With API key
curl -X POST http://192.168.1.101:8000/transcribe \
  -H "X-API-Key: your-secret-key" \
  -F "file=@recording.wav"

# Health check
curl http://192.168.1.101:8000/health
```

---

## ⚙️ Configuration

All configuration is done via the `.env` file in the project root:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `Speech to Text API` | Displayed in API docs |
| `APP_VERSION` | `1.0.0` | API version string |
| `PORT` | `8000` | Server port |
| `HOST` | `0.0.0.0` | Bind address (`0.0.0.0` = all interfaces) |
| `WHISPER_MODEL` | `tiny` | Whisper model size (see below) |
| `ALLOWED_EXTENSIONS` | `mp3,wav,m4a,webm` | Comma-separated allowed audio formats |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload file size in MB |
| `CORS_ORIGINS` | `*` | Comma-separated allowed CORS origins |
| `API_KEY` | *(empty)* | API key for authentication (leave blank to disable) |

---

## 🔑 Authentication

By default, the API is **open** — no authentication required (good for local/development use).

To enable API key protection:

1. Set a key in `.env`:
   ```env
   API_KEY="my-super-secret-key-abc123"
   ```
2. Restart the server.
3. All clients must now pass the key as an HTTP header:
   ```
   X-API-Key: my-super-secret-key-abc123
   ```

Requests without a valid key will receive `401 Unauthorized`.

---

## 🏎️ Performance & Models

The service runs Whisper locally on CPU. Choose the model based on your speed vs. accuracy needs:

| Model | Size | Speed (CPU) | Accuracy | Best For |
|-------|------|-------------|----------|----------|
| `tiny` | 39 MB | ~5-10s | Good | Development, quick tests |
| `base` | 74 MB | ~15-25s | Better | General use |
| `small` | 244 MB | ~30-60s | Great | Higher accuracy needs |
| `medium` | 769 MB | ~60-120s | Excellent | Production (GPU recommended) |
| `large` | 1.5 GB | ~120s+ | Best | GPU only |

Change the model by setting `WHISPER_MODEL` in `.env` and restarting the server.

> **GPU Acceleration:** If you have an NVIDIA GPU, install the CUDA version of PyTorch:
> ```bash
> pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
> ```
> The service will automatically use the GPU, making even the `small` model nearly real-time.

---

## 🌐 Deployment

### Run in Production (Gunicorn)

```bash
pip install gunicorn
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Docker

```dockerfile
FROM python:3.10-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t speech-intelligence-service .
docker run -p 8000:8000 --env-file .env speech-intelligence-service
```

### Deploy to Railway / Render

1. Push this repo to GitHub.
2. Connect to [Railway](https://railway.app) or [Render](https://render.com).
3. Set the start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from your `.env` file.
5. Set a build command if needed: `pip install -r requirements.txt && apt-get install -y ffmpeg`

---

## 🔧 Troubleshooting

### "Connection refused" on mobile
- Make sure the server is running with `--host 0.0.0.0`
- Your phone must be on the **same Wi-Fi network** as your computer
- Check your firewall — allow inbound connections on port 8000
- Find your computer's local IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

### Transcription is very slow
- Switch to the `tiny` model in `.env`: `WHISPER_MODEL="tiny"`
- Ensure `fp16=False` is set (already done in this project) to avoid CPU hang
- Consider using a GPU machine for the `small`/`medium` models

### "Invalid file type" error
- Check that your audio file has the correct extension (`.mp3`, `.wav`, `.m4a`, `.webm`)
- On web/browser, recordings are `webm` by default — make sure you're naming the file `audio.webm`

### iOS / Android blocks HTTP requests
- **iOS:** Add `NSAllowsArbitraryLoads: true` in `Info.plist` / `app.config.js`
- **Android:** Add `android:usesCleartextTraffic="true"` in `AndroidManifest.xml`

### Whisper model not found on first run
- The model is downloaded automatically on first startup (~40MB for `tiny`)
- Ensure you have internet access on first run; after that it's cached locally

---

## 📄 License

MIT License — free to use in personal and commercial projects.

---

<p align="center">
  Built with ❤️ using <a href="https://fastapi.tiangolo.com">FastAPI</a> & <a href="https://github.com/openai/whisper">OpenAI Whisper</a>
</p>
