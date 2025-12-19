import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentConfig } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id]/config - Get agent config for Python worker
// This endpoint is called by the Python agent to fetch its configuration
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("system_prompt, greeting, voice_id, tools")
      .eq("id", id)
      .single();

    if (error || !data) {
      // Return default config if agent not found
      return NextResponse.json({
        system_prompt: `You are a friendly and professional real estate assistant.
Your role is to help potential tenants and buyers with property inquiries.
Be conversational, helpful, and concise. Keep responses brief for voice.`,
        greeting: "Hi there! Thanks for calling. How can I help you today?",
        voice_id: "21m00Tcm4TlvDq8ikWAM",  // Rachel
        tools_enabled: ["check_availability", "book_tour"],
      } as AgentConfig);
    }

    const config: AgentConfig = {
      system_prompt: data.system_prompt,
      greeting: data.greeting,
      voice_id: data.voice_id,
      tools_enabled: data.tools || ["check_availability", "book_tour"],
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agent config" },
      { status: 500 }
    );
  }
}
