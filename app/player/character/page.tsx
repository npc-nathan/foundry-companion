'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CharacterSheet from '@/components/CharacterSheet';

type ActorStub = { name: string; id: string; type?: string };

function extractActors(data: Record<string, unknown>): ActorStub[] {
  const list: ActorStub[] = [];
  const dataBlock = data?.data as Record<string, unknown> | undefined;
  const folders = (dataBlock?.folders as Record<string, unknown>) || {};
  const entities = (dataBlock?.entities as Record<string, unknown>) || {};
  const actorEntities = (entities?.actors as unknown[]) || [];
  for (const e of actorEntities) {
    const ent = e as { name: string; id: string; type?: string };
    list.push({ name: ent.name, id: ent.id, type: ent.type });
  }
  for (const f of Object.values(folders)) {
    const folder = f as { entities?: unknown[] };
    if (folder?.entities) {
      for (const e of folder.entities) {
        const ent = e as { name: string; id: string; type?: string };
        list.push({ name: ent.name, id: ent.id, type: ent.type });
      }
    }
  }
  return list;
}

export default function PlayerCharacterPage() {
  const [selectedId, setSelectedId] = useState<string>('');

  const { data: structure } = useQuery({
    queryKey: ['structure', 'Actor'],
    queryFn: () => relay.structure('Actor'),
  });

  const actors = extractActors(structure as Record<string, unknown>);
  const characterActors = actors.filter((a) => a.type === 'character' || a.type === 'pc');
  const selectable = characterActors.length > 0 ? characterActors : actors;
  const uuid = selectedId ? `Actor.${selectedId}` : '';

  const handleSelect = useCallback((val: string) => {
    setSelectedId(val);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Actor Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">Character Sheet</h1>
          <p className="text-sm text-muted-foreground">
            View character stats, inventory, and spells
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedId} onValueChange={(v) => v && handleSelect(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a character..." />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CharacterSheet uuid={uuid} />
    </div>
  );
}
