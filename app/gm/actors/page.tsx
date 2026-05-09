'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function extractActors(data: any): Array<{ uuid: string; name: string; id: string; type?: string }> {
  const list: Array<{ uuid: string; name: string; id: string; type?: string }> = [];
  const folders: Record<string, any> = data?.data?.folders || {};
  const entities: any[] = data?.data?.entities?.actors || [];

  for (const e of entities) list.push(e);
  for (const f of Object.values(folders)) {
    if ((f as any)?.entities) {
      for (const e of (f as any).entities) list.push(e);
    }
  }
  return list;
}

export default function ActorsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['structure', 'Actor'],
    queryFn: () => relay.structure('Actor'),
  });

  const actors = extractActors(data);
  const filtered = search
    ? actors.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : actors;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading actors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Actors</h1>
        <p className="text-muted-foreground text-sm">{actors.length} total in world</p>
      </div>

      <input
        type="text"
        placeholder="Search actors..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
      />

      <div className="space-y-2">
        {filtered.map((actor) => (
          <Link
            key={actor.id}
            href={`/gm/actors/${actor.id}`}
            className="block"
          >
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {actor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{actor.name}</div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {actor.type || 'npc'}
                    </Badge>
                  </div>
                </div>
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No actors found</p>
        )}
      </div>
    </div>
  );
}
