import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent } from "@/types/database";

// GET /api/agents - List all agents
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Agent[]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, system_prompt, voice_id, greeting, tools } = body;

    if (!name || !system_prompt) {
      return NextResponse.json(
        { error: "Name and system_prompt are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        system_prompt,
        voice_id: voice_id || "21m00Tcm4TlvDq8ikWAM",  // Rachel
        greeting: greeting || "Hello, how can I help you today?",
        tools: tools || ["check_availability", "book_tour"],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Agent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
