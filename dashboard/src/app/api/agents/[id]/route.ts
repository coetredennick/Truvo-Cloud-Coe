import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id] - Get a single agent
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(data as Agent);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[id] - Update an agent
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, system_prompt, voice_id, greeting, tools } = body;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .update({
        name,
        system_prompt,
        voice_id,
        greeting,
        tools,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as Agent);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
