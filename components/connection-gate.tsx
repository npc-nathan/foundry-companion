'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { sseManager } from '@/lib/sse';
import { startHeadlessSession, endHeadlessSession } from '@/lib/session';

interface RelayClient {
  clientId: string;
  worldTitle: string;
  worldId: string;
  systemTitle: string;
  systemVersion: string;
  foundryVersion: string;
  connectedSince?: number;
  isOnline?: boolean;
}

type ConnectMode = 'api-key' | 'direct';

export function ConnectionGate() {
  const { config, status, setConfig, setStatus, setConnected } = useStore();

  // Connection mode state
  const [connectMode, setConnectMode] = useState<ConnectMode>('api-key');

  // Shared state
  const [relayUrl, setRelayUrl] = useState('https://foundryrestapi.com');
  const [apiKey, setApiKey] = useState('');
  const [role, setRole] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // API Key mode state
  const [clients, setClients] = useState<RelayClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [step, setStep] = useState<'credentials' | 'client-select'>('credentials');

  // Direct mode state
  const [foundryUrl, setFoundryUrl] = useState('');
  const [foundryUsername, setFoundryUsername] = useState('');
  const [foundryPassword, setFoundryPassword] = useState('');
  const [worldName, setWorldName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const hasAutoConnected = useRef(false);

  const handleConnect = useCallback(async () => {
    if (!relayUrl || !apiKey || !role) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('connecting');

    try {
      // Step 1: health check via proxy
      const healthResp = await fetch('/api/relay/api/health', {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': 'companion-app',
        },
      });
      const health = await healthResp.json();
      if (health.status !== 'ok') {
        throw new Error('Relay health check failed');
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
      });

      // Step 2: fetch connected Foundry clients via proxy
      const clientsResp = await fetch('/api/relay/clients', {
        headers: {
          'x-api-key': apiKey,
          'x-client-id': 'companion-app',
        },
      });
      const clientsData = await clientsResp.json();
      if (!clientsData.clients || clientsData.clients.length === 0) {
        throw new Error(
          'No connected Foundry worlds found. Make sure Foundry VTT is running and connected to the relay.',
        );
      }

      setClients(clientsData.clients);
      setSelectedClient(clientsData.clients[0].clientId);
      setStep('client-select');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
      setStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [relayUrl, apiKey, role, setStatus]);

  // Auto-reconnect: fires when Zustand hydrates persisted config (which happens after mount)
  useEffect(() => {
    if (hasAutoConnected.current) return;
    if (status.connected) {
      // Already shown as connected from persistence — background verify
      return;
    }
    if (!config.relayUrl || !config.apiKey || !config.role) return;
    hasAutoConnected.current = true;

    const doAutoConnect = async () => {
      // Sync the form fields from persisted config
      setRelayUrl(config.relayUrl);
      setApiKey(config.apiKey);
      setRole(config.role);
      // If we have a saved clientId, reconnect directly
      if (config.clientId && config.clientName) {
        setLoading(true);
        try {
          const healthResp = await fetch('/api/relay/api/health', {
            headers: { 'x-api-key': config.apiKey, 'x-client-id': 'companion-app' },
          });
          const health = await healthResp.json();
          if (health.status !== 'ok') throw new Error('Relay not reachable');

          await fetch('/api/store-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relayUrl: config.relayUrl,
              apiKey: config.apiKey,
              clientId: 'companion-app',
            }),
          });

          await setConfig({
            relayUrl: config.relayUrl,
            apiKey: config.apiKey,
            clientId: config.clientId,
            clientName: config.clientName,
            role: config.role as 'gm' | 'player',
          });
          setConnected(true);

          sseManager.subscribe('encounter', config.relayUrl, config.apiKey, config.clientId);
          sseManager.subscribe('chat', config.relayUrl, config.apiKey, config.clientId);
          sseManager.subscribe('scene', config.relayUrl, config.apiKey, config.clientId);
          sseManager.subscribe('rolls', config.relayUrl, config.apiKey, config.clientId);
          sseManager.subscribe('hook', config.relayUrl, config.apiKey, config.clientId);
        } catch {
          setLoading(false);
          handleConnect();
        }
      } else {
        handleConnect();
      }
    };

    doAutoConnect();
    // No dependencies — only runs once on mount via hasAutoConnected guard
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFinalize = useCallback(() => {
    const client = clients.find((c) => c.clientId === selectedClient);
    if (!client) {
      setError('Please select a Foundry world');
      return;
    }

    setConfig({
      relayUrl,
      apiKey,
      clientId: client.clientId,
      clientName: client.worldTitle,
      role: role as 'gm' | 'player',
      sessionId: undefined,
    });
    setConnected(true);

    // Subscribe to real-time SSE channels
    sseManager.subscribe('encounter', relayUrl, apiKey, client.clientId);
    sseManager.subscribe('chat', relayUrl, apiKey, client.clientId);
    sseManager.subscribe('scene', relayUrl, apiKey, client.clientId);
    sseManager.subscribe('rolls', relayUrl, apiKey, client.clientId);
    sseManager.subscribe('hook', relayUrl, apiKey, client.clientId);
  }, [relayUrl, apiKey, role, selectedClient, clients, setConfig, setConnected]);

  const handleDirectLogin = useCallback(async () => {
    if (!relayUrl || !apiKey || !foundryUrl || !foundryUsername || !foundryPassword || !role) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('connecting');

    try {
      // Step 1: health check
      const healthResp = await fetch('/api/relay/api/health', {
        headers: { 'x-api-key': apiKey, 'x-client-id': 'companion-app' },
      });
      const health = await healthResp.json();
      if (health.status !== 'ok') {
        throw new Error('Relay health check failed');
      }

      // Step 2: start headless session
      const result = await startHeadlessSession(
        relayUrl,
        apiKey,
        foundryUrl,
        foundryUsername,
        foundryPassword,
        worldName || undefined,
      );

      setSessionId(result.sessionId);

      // Store auth in cookie
      await fetch('/api/store-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relayUrl, apiKey, clientId: result.clientId }),
      });

      setConfig({
        relayUrl,
        apiKey,
        clientId: result.clientId,
        clientName: `${foundryUsername}'s Session`,
        role: role as 'gm' | 'player',
        sessionId: result.sessionId,
      });
      setConnected(true);

      // Subscribe to real-time SSE channels
      sseManager.subscribe('encounter', relayUrl, apiKey, result.clientId);
      sseManager.subscribe('chat', relayUrl, apiKey, result.clientId);
      sseManager.subscribe('scene', relayUrl, apiKey, result.clientId);
      sseManager.subscribe('rolls', relayUrl, apiKey, result.clientId);
      sseManager.subscribe('hook', relayUrl, apiKey, result.clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Direct login failed');
      setStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [
    relayUrl,
    apiKey,
    foundryUrl,
    foundryUsername,
    foundryPassword,
    worldName,
    role,
    setConfig,
    setConnected,
    setStatus,
  ]);

  const handleBack = useCallback(() => {
    setStep('credentials');
    setError(null);
  }, []);

  // Cleanup headless session on unmount
  useEffect(() => {
    return () => {
      if (sessionId && apiKey) {
        endHeadlessSession(apiKey, sessionId).catch(() => {});
      }
    };
  }, [sessionId, apiKey]);

  // Client select step — used by API Key mode only
  if (step === 'client-select') {
    const selected = clients.find((c) => c.clientId === selectedClient);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select Foundry World</CardTitle>
            <CardDescription>Choose which Foundry VTT world to connect to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clients.map((c) => (
              <button
                key={c.clientId}
                onClick={() => setSelectedClient(c.clientId)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedClient === c.clientId
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
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
                Connect to {selected?.worldTitle || 'World'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main login screen with tabs
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect to Foundry</CardTitle>
          <CardDescription>Choose how to connect to your Foundry VTT world</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            <button
              onClick={() => {
                setConnectMode('api-key');
                setError(null);
              }}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                connectMode === 'api-key'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              API Key
            </button>
            <button
              onClick={() => {
                setConnectMode('direct');
                setError(null);
              }}
              className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                connectMode === 'direct'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Direct Login
            </button>
          </div>

          {/* Shared: Relay URL + API Key + Role */}
          <div className="space-y-2">
            <Label htmlFor="relay-url">Relay URL</Label>
            <Input
              id="relay-url"
              type="url"
              value={relayUrl}
              onChange={(e) => setRelayUrl(e.target.value)}
              placeholder="https://foundryrestapi.com"
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

          {/* API Key mode: world selection flow */}
          {connectMode === 'api-key' && (
            <>
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
                {loading ? 'Connecting...' : 'Connect to Foundry'}
              </Button>
            </>
          )}

          {/* Direct Login mode: Foundry credentials */}
          {connectMode === 'direct' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="foundry-url">Foundry URL</Label>
                <Input
                  id="foundry-url"
                  type="url"
                  value={foundryUrl}
                  onChange={(e) => setFoundryUrl(e.target.value)}
                  placeholder="http://localhost:30000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundry-username">Username</Label>
                <Input
                  id="foundry-username"
                  type="text"
                  value={foundryUsername}
                  onChange={(e) => setFoundryUsername(e.target.value)}
                  placeholder="Enter your Foundry username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundry-password">Password</Label>
                <Input
                  id="foundry-password"
                  type="password"
                  value={foundryPassword}
                  onChange={(e) => setFoundryPassword(e.target.value)}
                  placeholder="Enter your Foundry password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="world-name">World Name (optional)</Label>
                <Input
                  id="world-name"
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  placeholder="Leave blank to use default world"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-direct">Role</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v)}>
                  <SelectTrigger id="role-direct">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gm">Game Master</SelectItem>
                    <SelectItem value="player">Player</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={handleDirectLogin} className="w-full" disabled={loading}>
                {loading ? 'Connecting...' : 'Connect to Foundry'}
              </Button>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground mt-2">
            Powered by the Foundry Rest API Relay{' '}
            <a
              href="https://github.com/ThreeHats/foundryvtt-rest-api-relay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View setup instructions
            </a>
          </p>

          <p className="text-xs text-center text-muted-foreground">
            <a
              href="https://github.com/npc-nathan/foundry-companion"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Foundry Companion on GitHub
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
