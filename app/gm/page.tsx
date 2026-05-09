'use client';

import { useStore } from '@/lib/store';
import { relay } from '@/lib/relay';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function flattenActorCount(structureResp: any): number {
  const data = structureResp?.data || {};
  const folders: Record<string, any> = data?.folders || {};
  const entities: any[] = data?.entities?.actors || [];
  let count = entities.length;
  for (const f of Object.values(folders)) {
    const ents = (f as any)?.entities;
    if (ents) count += ents.length;
  }
  return count;
}

function findSceneCount(structureResp: any): number {
  const data = structureResp?.data || {};
  // Scenes live at root-level data.entities.scenes[], not in folders
  const rootScenes: any[] = data?.entities?.scenes || [];
  return rootScenes.length;
}

export default function GMDashboard() {
  const config = useStore((s) => s.config);

  const { data: structure } = useQuery({
    queryKey: ['structure', 'Actor,Scene'],
    queryFn: () => relay.structure('Actor,Scene'),
    refetchInterval: 30000,
  });

  const { data: encounters } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => relay.encounters(),
    refetchInterval: 10000,
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: () =>
      fetch('/api/relay/session', {
        headers: {
          'x-api-key': config.apiKey,
          'x-client-id': config.clientId || 'companion-app',
        },
      }).then((r) => r.json()),
    refetchInterval: 15000,
  });

  const actorCount = structure ? flattenActorCount(structure) : '?';
  const sceneCount = structure ? findSceneCount(structure) : '?';
  const activeEncounters = (encounters as any)?.encounters?.length || 0;
  const playerCount = (session as any)?.activeSessions?.length || '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GM Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connected to {config.relayUrl}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{actorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">in world</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sceneCount}</div>
            <p className="text-xs text-muted-foreground mt-1">total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Combat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeEncounters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeEncounters === 1 ? 'active encounter' : 'active encounters'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{playerCount}</div>
            <p className="text-xs text-muted-foreground mt-1">active sessions</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href="/gm/actors"
            className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="font-medium">Actors</div>
            <div className="text-xs text-muted-foreground mt-1">Search, damage, heal, conditions</div>
          </Link>
          <Link
            href="/gm/combat"
            className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="font-medium">Combat Tracker</div>
            <div className="text-xs text-muted-foreground mt-1">Initiative, turns, rounds</div>
          </Link>
          <Link
            href="/gm/scenes"
            className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="font-medium">Scenes</div>
            <div className="text-xs text-muted-foreground mt-1">Switch and manage scenes</div>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Active Encounters</h2>
        {(encounters as any)?.encounters?.length > 0 ? (
          <Card>
            <CardContent className="p-0 divide-y">
              {(encounters as any).encounters.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div>
                    <span className="font-medium">{e.name || e.id}</span>
                    <Badge variant="outline" className="ml-2 text-xs">Round {e.round || 1}</Badge>
                  </div>
                  <Badge variant={e.active ? 'default' : 'secondary'}>
                    {e.active ? 'Active' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No active encounters</p>
              <p className="text-xs mt-1">Start one from Foundry VTT to see it here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
