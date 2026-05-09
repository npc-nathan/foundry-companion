"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/lib/store"

interface RelayClient {
  clientId: string
  worldTitle: string
  worldId: string
  systemTitle: string
  systemVersion: string
  foundryVersion: string
  connectedSince?: number
  isOnline?: boolean
}

export function ConnectionGate() {
  const { config, status, setConfig, setStatus, setConnected } = useStore()

  const [relayUrl, setRelayUrl] = useState("http://localhost:3010")
  const [apiKey, setApiKey] = useState("")
  const [role, setRole] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<RelayClient[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [step, setStep] = useState<"credentials" | "client-select">("credentials")
  const hasAutoConnected = useRef(false)

  // Auto-reconnect: fires when Zustand hydrates persisted config (which happens after mount)
  useEffect(() => {
    if (hasAutoConnected.current) return
    if (status.connected) {
      // Already shown as connected from persistence — background verify
      return
    }
    if (!config.relayUrl || !config.apiKey || !config.role) return
    hasAutoConnected.current = true

    // Sync the form fields from persisted config
    setRelayUrl(config.relayUrl)
    setApiKey(config.apiKey)
    setRole(config.role)

    const doAutoConnect = async () => {
      // If we have a saved clientId, reconnect directly
      if (config.clientId && config.clientName) {
        setLoading(true)
        try {
          const healthResp = await fetch('/api/relay/api/health', {
            headers: { 'x-api-key': config.apiKey, 'x-client-id': 'companion-app' },
          })
          const health = await healthResp.json()
          if (health.status !== "ok") throw new Error("Relay not reachable")

          // Re-store auth cookie
          await fetch('/api/store-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relayUrl: config.relayUrl, apiKey: config.apiKey, clientId: 'companion-app' }),
          })

          await setConfig({
            relayUrl: config.relayUrl,
            apiKey: config.apiKey,
            clientId: config.clientId,
            clientName: config.clientName,
            role: config.role as "gm" | "player",
          })
          setConnected(true)
        } catch {
          // Fall through to normal connect flow
          setLoading(false)
          handleConnect()
        }
      } else {
        handleConnect()
      }
    }

    doAutoConnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.relayUrl, config.apiKey, config.role, config.clientId, config.clientName, status.connected])

  const handleConnect = useCallback(async () => {
    if (!relayUrl || !apiKey || !role) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)
    setStatus("connecting")

    try {
      // Step 1: health check via proxy
      const healthResp = await fetch('/api/relay/api/health', {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': 'companion-app',
        },
      })
      const health = await healthResp.json()
      if (health.status !== "ok") {
        throw new Error("Relay health check failed")
      }

      // Store auth in cookie for image proxy and other browser-initiated requests
      await fetch('/api/store-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relayUrl,
          apiKey,
          clientId: 'companion-app',
        }),
      })

      // Step 2: fetch connected Foundry clients via proxy
      const clientsResp = await fetch('/api/relay/clients', {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': 'companion-app',
        },
      })
      const clientsData = await clientsResp.json()
      if (!clientsData.clients || clientsData.clients.length === 0) {
        throw new Error("No connected Foundry worlds found. Make sure Foundry VTT is running and connected to the relay.")
      }

      setClients(clientsData.clients)
      setSelectedClient(clientsData.clients[0].clientId)
      setStep("client-select")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed")
      setStatus("disconnected")
    } finally {
      setLoading(false)
    }
  }, [relayUrl, apiKey, role, setConfig, setStatus])

  const handleFinalize = useCallback(() => {
    const client = clients.find((c) => c.clientId === selectedClient)
    if (!client) {
      setError("Please select a Foundry world")
      return
    }

    setConfig({
      relayUrl,
      apiKey,
      clientId: client.clientId,
      clientName: client.worldTitle,
      role: role as "gm" | "player",
    })
    setConnected(true)
  }, [relayUrl, apiKey, role, selectedClient, clients, setConfig, setConnected])

  const handleBack = useCallback(() => {
    setStep("credentials")
    setError(null)
  }, [])

  if (step === "client-select") {
    const selected = clients.find((c) => c.clientId === selectedClient)
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select Foundry World</CardTitle>
            <CardDescription>
              Choose which Foundry VTT world to connect to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clients.map((c) => (
              <button
                key={c.clientId}
                onClick={() => setSelectedClient(c.clientId)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedClient === c.clientId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="font-medium">{c.worldTitle}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {c.systemTitle} v{c.systemVersion}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {c.foundryVersion} · {c.worldId}
                </div>
                {c.connectedSince && (
                  <div className="text-xs text-muted-foreground">
                    Connected since {new Date(c.connectedSince).toLocaleTimeString()}
                  </div>
                )}
              </button>
            ))}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleFinalize} className="flex-1">
                Connect to {selected?.worldTitle || "World"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect to Foundry</CardTitle>
          <CardDescription>
            Enter your Relay server details to connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="relay-url">Relay URL</Label>
            <Input
              id="relay-url"
              type="url"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="http://localhost:3010"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gm">Game Master</SelectItem>
                <SelectItem value="player">Player</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleConnect} className="w-full" disabled={loading}>
            {loading ? "Connecting..." : "Connect to Foundry"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
