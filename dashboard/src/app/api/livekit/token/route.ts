import { NextRequest, NextResponse } from "next/server";
import { createLiveKitToken, getLiveKitUrl } from "@/lib/livekit";

// POST /api/livekit/token - Generate a LiveKit access token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomName, participantName } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "roomName and participantName are required" },
        { status: 400 }
      );
    }

    const token = await createLiveKitToken(roomName, participantName);
    const wsUrl = getLiveKitUrl();

    return NextResponse.json({ token, wsUrl });
  } catch (error) {
    console.error("Failed to generate token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
