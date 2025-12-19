"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/types/database";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createAgent() {
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Agent",
          system_prompt: `You are a friendly and professional real estate assistant.
Your role is to help potential tenants and buyers with property inquiries.

You can:
- Answer questions about available properties
- Schedule property tours
- Provide general information about the leasing process

Be conversational, helpful, and concise. Keep responses brief for voice.`,
          greeting: "Hi there! Thanks for calling. How can I help you today?",
          voice_id: "rachel",
          tools: ["check_availability", "book_tour"],
        }),
      });

      if (res.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error("Failed to create agent:", error);
    }
  }

  async function deleteAgent(id: string) {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading agents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 mt-1">
            Create and manage your AI voice agents
          </p>
        </div>
        <Button onClick={createAgent}>Create Agent</Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No agents yet</p>
            <Button onClick={createAgent}>Create Your First Agent</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Voice: {agent.voice_id} | Created:{" "}
                    {new Date(agent.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {agent.tools?.map((tool) => (
                    <Badge key={tool} variant="secondary">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {agent.system_prompt}
                </p>
                <div className="flex gap-2">
                  <Link href={`/dashboard/agents/${agent.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/dashboard/playground?agent=${agent.id}`}>
                    <Button variant="outline" size="sm">
                      Test
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteAgent(agent.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
