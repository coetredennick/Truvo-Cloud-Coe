-- Truvo Cloud Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension (should already be enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table: stores AI agent configurations
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  voice_id TEXT DEFAULT 'rachel',
  greeting TEXT DEFAULT 'Hello, how can I help you today?',
  tools JSONB DEFAULT '["check_availability", "book_tour"]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls table: stores call logs and transcripts
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript JSONB,
  recording_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);

-- Updated at trigger for agents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- For a single-tenant MVP, we'll allow all authenticated operations
-- Add tenant isolation later when moving to multi-tenant

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-tenant MVP)
CREATE POLICY "Allow all for authenticated users" ON agents
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON calls
  FOR ALL USING (true);

-- Sample agent for testing
INSERT INTO agents (name, system_prompt, voice_id, greeting, tools)
VALUES (
  'Property Leasing Agent',
  'You are a friendly and professional real estate assistant for Truvo Properties.
Your role is to help potential tenants and buyers with property inquiries.

You can:
- Answer questions about available properties
- Schedule property tours using the book_tour function
- Check availability for tour times
- Provide general information about the leasing process

Be conversational, helpful, and concise. Keep responses brief for voice - typically 1-2 sentences.
If someone wants to book a tour, collect their name, email, preferred date, and time, then use the booking function.

Property Information:
- We have 1, 2, and 3 bedroom apartments available
- Rent ranges from $1,500 to $3,000 per month
- All units include in-unit washer/dryer and parking
- Pets are welcome with a small deposit
- Lease terms are typically 12 months',
  'rachel',
  'Hi there! Thanks for calling Truvo Properties. I''m here to help you find your perfect home. Are you looking to schedule a tour or do you have questions about our available properties?',
  '["check_availability", "book_tour"]'
) ON CONFLICT DO NOTHING;
