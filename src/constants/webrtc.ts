// WebRTC ICE server configuration for 1-to-1 PULSR voice calls.
// Uses public Google STUN servers by default.

// TODO: For production reliability across strict corporate firewalls and symmetric NATs,
// provision a dedicated TURN server (e.g., coturn, Twilio NTS, or Cloudflare Calls)
// and supply VITE_TURN_URL, VITE_TURN_USERNAME, and VITE_TURN_CREDENTIAL in your environment.
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    });
  }

  return servers;
}

export const CALL_RING_TIMEOUT_MS = 35_000;
