import { AccessToken } from "livekit-server-sdk";

export async function createLiveKitToken(
  roomName: string,
  participantName: string,
  options?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
  }
): Promise<string> {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantName,
      ttl: "1h",
    }
  );

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: options?.canPublish ?? true,
    canSubscribe: options?.canSubscribe ?? true,
  });

  return await at.toJwt();
}

export function getLiveKitUrl(): string {
  return process.env.LIVEKIT_URL || "";
}
