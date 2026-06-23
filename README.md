# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Backend setup

A starter Express backend is available in the `backend` folder.

1. Install backend dependencies

   ```bash
   cd backend
   npm install
   ```

2. Create your environment file

   ```bash
   copy .env.example .env
   ```

   Set MongoDB in `backend/.env`:

   - `MONGODB_URI` (local or Atlas connection string)
   - `MONGODB_DB` (database name)

   Optional for frontend app (root `.env`):

   - `EXPO_PUBLIC_API_URL=http://localhost:5000`

3. Run the backend API

   ```bash
   npm run dev
   ```

You can also run backend scripts from the project root:

```bash
npm run backend:dev
```

Default API URL: `http://localhost:5000`

Available starter routes:

- `GET /`
- `GET /api/health`
- `GET /api/v1/ping`

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Voice logging / Speech-to-text

The mic button on the dashboard (`home`) and logs screens records audio and sends
it to a self-hosted [Whisper](https://github.com/openai/whisper) speech-to-text
service (cloned into [`stt-service/`](stt-service/)). The Node backend
**auto-starts** this Python service, so running the backend is all that's needed.

One-time setup (requires Python 3.9+ and FFmpeg on PATH):

```bash
cd stt-service
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt   # Windows
# source venv/bin/activate && pip install -r requirements.txt # macOS/Linux
cp .env.example .env
```

After that, just run the backend — it spawns the STT service on port `8000`:

```bash
npm run backend:start
```

You should see `[stt] Uvicorn running on http://0.0.0.0:8000` in the logs. The app
reaches it automatically at `<backend-host>:8000` (same LAN IP as the API).

Configuration (in `backend/.env`):

- `STT_AUTOSTART=true` — set to `false` to run `stt-service` manually instead.
- `STT_PORT=8000` — port the Whisper service binds to.

Override the URL the app uses with `EXPO_PUBLIC_STT_URL` if needed. The first
transcription downloads the Whisper `tiny` model (~39 MB) and caches it.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
