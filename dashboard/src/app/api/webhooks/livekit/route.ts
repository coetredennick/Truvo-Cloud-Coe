import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

// POST /api/webhooks/livekit - Handle LiveKit webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify webhook signature
    const event = await receiver.receive(body, authHeader);
    const supabase = createAdminClient();

    console.log("LiveKit webhook event:", event.event);

    switch (event.event) {
      case "room_started": {
        // A new room was created - could log this if needed
        console.log(`Room started: ${event.room?.name}`);
        break;
      }

      case "participant_joined": {
        // A participant joined the room
        const roomName = event.room?.name;
        const participantIdentity = event.participant?.identity;
        console.log(`Participant ${participantIdentity} joined room ${roomName}`);

        // If this is a user (not the agent), create a call record
        if (participantIdentity && !participantIdentity.startsWith("agent-")) {
          // Extract agent ID from room name if present
          const match = roomName?.match(/^agent-([^-]+)/);
          const agentId = match?.[1] || null;

          await supabase.from("calls").insert({
            agent_id: agentId,
            room_name: roomName,
            metadata: {
              participant: participantIdentity,
            },
          });
        }
        break;
      }

      case "participant_left": {
        // A participant left the room
        console.log(
          `Participant ${event.participant?.identity} left room ${event.room?.name}`
        );
        break;
      }

      case "room_finished": {
        // Room ended - update call record with duration
        const roomName = event.room?.name;
        console.log(`Room finished: ${roomName}`);

        if (roomName) {
          // Calculate duration from room metadata
          const startTime = event.room?.creationTime
            ? new Date(Number(event.room.creationTime) * 1000)
            : null;
          const endTime = new Date();
          const durationSeconds = startTime
            ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
            : null;

          await supabase
            .from("calls")
            .update({
              ended_at: endTime.toISOString(),
              duration_seconds: durationSeconds,
            })
            .eq("room_name", roomName)
            .is("ended_at", null);
        }
        break;
      }

      case "track_published": {
        // A track was published (audio/video)
        console.log(
          `Track published by ${event.participant?.identity}: ${event.track?.type}`
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
