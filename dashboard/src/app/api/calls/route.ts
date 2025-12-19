import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Call } from "@/types/database";

// GET /api/calls - List all calls with optional agent filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createAdminClient();
    let query = supabase
      .from("calls")
      .select("*, agents(name)")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Call[]);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

// POST /api/calls - Create a new call record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, room_name, metadata } = body;

    if (!room_name) {
      return NextResponse.json(
        { error: "room_name is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("calls")
      .insert({
        agent_id,
        room_name,
        metadata,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Call, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}
