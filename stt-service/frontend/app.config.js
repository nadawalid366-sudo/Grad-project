// app.config.js — edit BACKEND_IP to match your computer's local Wi-Fi IP.
// Run `ipconfig` on Windows or `ifconfig` on Mac/Linux to find it.
const BACKEND_IP = '192.168.1.101';
const BACKEND_PORT = '8000';

module.exports = {
  expo: {
    name: 'VoiceToTextApp',
    slug: 'voice-to-text-app',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    extra: {
      backendUrl: `http://${BACKEND_IP}:${BACKEND_PORT}`,
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription:
          'This app uses the microphone to record audio for transcription.',
        // Allow HTTP connections to local network on iOS
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    android: {
      permissions: ['android.permission.RECORD_AUDIO'],
      usesCleartextTraffic: true, // Allow HTTP (non-HTTPS) to local network
    },
    plugins: [
      [
        'expo-av',
        {
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone.',
        },
      ],
    ],
  },
};
