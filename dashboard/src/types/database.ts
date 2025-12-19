export interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  voice_id: string;
  greeting: string;
  tools: string[];
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  agent_id: string;
  room_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: TranscriptEntry[] | null;
  recording_url: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: string;
}

export interface AgentConfig {
  system_prompt: string;
  greeting: string;
  voice_id: string;
  tools_enabled: string[];
}
