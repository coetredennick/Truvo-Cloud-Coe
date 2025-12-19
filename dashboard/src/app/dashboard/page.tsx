import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome to Truvo Cloud - your AI voice agent platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>
              Configure your AI voice agents with custom prompts and voices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/agents">
              <Button className="w-full">Manage Agents</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls</CardTitle>
            <CardDescription>
              View call logs, transcripts, and recordings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/calls">
              <Button variant="outline" className="w-full">View Call Logs</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Playground</CardTitle>
            <CardDescription>
              Test your agents in real-time via browser audio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/playground">
              <Button variant="outline" className="w-full">Open Playground</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get your first agent running in minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h3 className="font-medium">Create an Agent</h3>
              <p className="text-sm text-gray-500">
                Go to Agents and create a new agent with your custom system prompt
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h3 className="font-medium">Test in Playground</h3>
              <p className="text-sm text-gray-500">
                Use the Playground to test your agent via browser microphone
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h3 className="font-medium">Connect Phone Numbers</h3>
              <p className="text-sm text-gray-500">
                Add SIP trunks to receive calls on real phone numbers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
