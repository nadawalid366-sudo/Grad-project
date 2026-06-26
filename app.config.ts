import os from "os";

// Runs on the DEV MACHINE at Metro start time (not on the phone).
// Finds the first non-loopback IPv4 LAN address so the phone always reaches
// the backend at the correct IP — no manual updates needed when the network changes.
function getLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const lanIp = getLanIp();

export default ({ config }: { config: Record<string, unknown> }) => ({
  ...config,
  extra: {
    ...((config.extra as Record<string, unknown>) ?? {}),
    EXPO_PUBLIC_API_URL: `http://${lanIp}:5001`,
  },
});
