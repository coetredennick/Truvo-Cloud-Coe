"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/types/database";

const AVAILABLE_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Female, American)" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Male, American)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Female, British)" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam (Male, American)" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Female, Young)" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam (Male, American)" },
];

const AVAILABLE_TOOLS = [
  { id: "check_availability", name: "Check Availability", description: "Query Cal.com for available tour times" },
  { id: "book_tour", name: "Book Tour", description: "Create a booking on Cal.com" },
];

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAgent();
  }, [params.id]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/agents/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      } else {
        router.push("/dashboard/agents");
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error);
      router.push("/dashboard/agents");
    } finally {
      setLoading(false);
    }
  }

  async function saveAgent() {
    if (!agent) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agent),
      });

      if (res.ok) {
        router.push("/dashboard/agents");
      }
    } catch (error) {
      console.error("Failed to save agent:", error);
    } finally {
      setSaving(false);
    }
  }

  function toggleTool(toolId: string) {
    if (!agent) return;
    const tools = agent.tools || [];
    const newTools = tools.includes(toolId)
      ? tools.filter((t) => t !== toolId)
      : [...tools, toolId];
    setAgent({ ...agent, tools: newTools });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading agent...</p>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Agent</h1>
          <p className="text-gray-500 mt-1">Configure your agent's personality and capabilities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/agents")}>
            Cancel
          </Button>
          <Button onClick={saveAgent} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={agent.name}
              onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              placeholder="e.g., Property Leasing Agent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            <select
              id="voice"
              value={agent.voice_id}
              onChange={(e) => setAgent({ ...agent, voice_id: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AVAILABLE_VOICES.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Greeting</CardTitle>
          <CardDescription>
            The first message the agent says when a call starts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={agent.greeting}
            onChange={(e) => setAgent({ ...agent, greeting: e.target.value })}
            rows={3}
            placeholder="Hi there! Thanks for calling..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Define your agent's personality, knowledge, and behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={agent.system_prompt}
            onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
            rows={12}
            placeholder="You are a friendly real estate assistant..."
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tools</CardTitle>
          <CardDescription>
            Enable capabilities that the agent can use during conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {AVAILABLE_TOOLS.map((tool) => (
              <label
                key={tool.id}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={agent.tools?.includes(tool.id) || false}
                  onChange={() => toggleTool(tool.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-sm text-gray-500">{tool.description}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
