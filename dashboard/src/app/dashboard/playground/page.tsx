"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@/types/database";

function ConnectionControls({
  onConnect,
  onDisconnect,
  isConnecting,
}: {
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
}) {
  const connectionState = useConnectionState();
  const connected = connectionState === ConnectionState.Connected;

  return (
    <div className="flex items-center gap-4">
      {!connected ? (
        <Button onClick={onConnect} disabled={isConnecting} size="lg">
          {isConnecting ? "Connecting..." : "Start Conversation"}
        </Button>
      ) : (
        <Button onClick={onDisconnect} variant="destructive" size="lg">
          End Conversation
        </Button>
      )}
      {connected && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-600">Connected</span>
        </div>
      )}
    </div>
  );
}

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("agent");

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agentIdParam);
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (agentIdParam) {
      setSelectedAgentId(agentIdParam);
    }
  }, [agentIdParam]);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
        if (data.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  }

  const handleConnect = useCallback(async () => {
    if (!selectedAgentId) return;

    setIsConnecting(true);
    try {
      const room = `agent-${selectedAgentId}-${Date.now()}`;

      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: room,
          participantName: `user-${Date.now()}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setWsUrl(data.wsUrl);
      } else {
        console.error("Failed to get token");
      }
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [selectedAgentId]);

  const handleDisconnect = useCallback(() => {
    setToken(null);
    setWsUrl(null);
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Playground</h1>
        <p className="text-gray-500 mt-1">
          Test your voice agents in real-time using your browser microphone
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Voice Test</CardTitle>
              <CardDescription>
                {selectedAgent
                  ? `Testing: ${selectedAgent.name}`
                  : "Select an agent to test"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Agent</label>
                <select
                  value={selectedAgentId || ""}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!token}
                >
                  <option value="">Choose an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>

              {agents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No agents found.</p>
                  <p className="text-sm mt-1">
                    Create an agent first, then come back to test it.
                  </p>
                </div>
              )}

              {selectedAgentId && (
                <div className="flex flex-col items-center py-8 space-y-6">
                  {token && wsUrl ? (
                    <LiveKitRoom
                      token={token}
                      serverUrl={wsUrl}
                      connect={true}
                      audio={true}
                      video={false}
                      onDisconnected={handleDisconnect}
                    >
                      <RoomAudioRenderer />
                      <ConnectionControls
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        isConnecting={isConnecting}
                      />
                    </LiveKitRoom>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                      </div>
                      <Button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        size="lg"
                      >
                        {isConnecting ? "Connecting..." : "Start Conversation"}
                      </Button>
                      <p className="text-sm text-gray-500">
                        Make sure your Python agent worker is running
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Agent Info</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAgent ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-500">Name</div>
                    <div>{selectedAgent.name}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Voice</div>
                    <div>{selectedAgent.voice_id}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Greeting</div>
                    <div className="text-gray-700">{selectedAgent.greeting}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-500">Tools</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAgent.tools?.map((tool) => (
                        <span
                          key={tool}
                          className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  Select an agent to see details
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>How to Test</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-2">
              <p>1. Make sure your Python agent is running:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs">
                cd agent && python agent.py dev
              </code>
              <p className="mt-3">2. Select an agent and click Start Conversation</p>
              <p>3. Allow microphone access when prompted</p>
              <p>4. Speak naturally - the agent will respond</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading playground...</p>
      </div>
    }>
      <PlaygroundContent />
    </Suspense>
  );
}
