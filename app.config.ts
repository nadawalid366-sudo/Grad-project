import os from "os";

// Patterns matching virtual/hypervisor adapters that are not reachable from a
// physical device on the LAN (VMware, VirtualBox, Hyper-V, TAP/TUN, etc.).
const VIRTUAL_ADAPTER_PATTERNS = [
  /vmware/i,
  /virtualbox/i,
  /hyper-v/i,
  /vethernet/i,
  /loopback/i,
  /pseudo/i,
  /tap/i,
  /tun/i,
];

// Runs on the DEV MACHINE at Metro start time (not on the phone).
// Finds the first non-loopback, non-virtual IPv4 LAN address so the phone
// always reaches the backend at the correct IP.
function getLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (VIRTUAL_ADAPTER_PATTERNS.some((p) => p.test(name))) continue;
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
