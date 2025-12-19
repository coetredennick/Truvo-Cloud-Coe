"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Call } from "@/types/database";

interface CallWithAgent extends Call {
  agents?: { name: string };
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallWithAgent | null>(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  async function fetchCalls() {
    try {
      const res = await fetch("/api/calls");
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
      }
    } catch (error) {
      console.error("Failed to fetch calls:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading calls...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
        <p className="text-gray-500 mt-1">
          View conversation history and transcripts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>
                {calls.length} total calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calls.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No calls yet. Test your agent in the Playground to create call records.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map((call) => (
                      <TableRow
                        key={call.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedCall(call)}
                      >
                        <TableCell className="font-medium">
                          {call.agents?.name || "Unknown Agent"}
                        </TableCell>
                        <TableCell>
                          {new Date(call.started_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                        <TableCell>
                          <Badge variant={call.ended_at ? "secondary" : "default"}>
                            {call.ended_at ? "Completed" : "In Progress"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                {selectedCall
                  ? `Call from ${new Date(selectedCall.started_at).toLocaleString()}`
                  : "Select a call to view transcript"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCall?.transcript ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedCall.transcript.map((entry, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        entry.role === "agent"
                          ? "bg-blue-50 text-blue-900"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {entry.role === "agent" ? "Agent" : "User"}
                      </div>
                      <div className="text-sm">{entry.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {selectedCall
                    ? "No transcript available for this call"
                    : "Click on a call to view its transcript"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
